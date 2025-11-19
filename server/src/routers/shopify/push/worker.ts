import { db } from '../../../db';
import { work } from '../../../utils/workerBase';
import { diffUpload } from './diffUpload';
import type { ImageMap } from './types';
import { executeBulkMutation } from '../bulk';
import { shopifyMetadata } from './shopifyMetadata.table';
import { shopifyMedia } from './media.table';
import { eq } from 'drizzle-orm';
import type { ProductPushMutation } from '../../../../types/admin.generated';

work({
	process: async ({ progress }) => {
		progress(-1);

		const { products, images } = await fetchData();
		const imageMap = createImageMap(images);
		const allUploads = prepareUploads(products, imageMap);

		console.log(`Preparing to upload ${allUploads.length} products to Shopify.`);
		console.log(
			`${allUploads[0]?.product.shopifyRowContent?.handle} ${allUploads[0]?.product.shopifyRowContent?.onlineStoreUrl} ${allUploads[0]?.product.shopifyRowContent?.onlineStorePreviewUrl}`
		);

		// return;

		const batchSize = 100;
		for (let i = 0; i < allUploads.length; i += batchSize) {
			const batch = allUploads.slice(i, i + batchSize);

			await markBatchPending(batch);

			const variables = batch.map((item) => ({
				input: item.productSetInput
			}));

			const mutation = `#graphql
				mutation productPush($input: ProductSetInput!) {
					productSet(input: $input) {
						product {
							id
							handle
							media(first: 50) {
								nodes {
									id
									status
									alt
									
								}
							}
						}
						userErrors {
							field
							message
						}
					}
				}
			`;

			try {
				const results = await executeBulkMutation<{
					data: ProductPushMutation;
					__lineNumber: number;
				}>(mutation, variables);
				await processBatchResults(results, batch);
			} catch (e) {
				console.error('Bulk mutation failed:', e);
				await markBatchFailed(batch);
			}

			progress((i + batch.length) / allUploads.length);
		}
	}
});

async function fetchData() {
	return await db.transaction(async (tx) => {
		const products = await tx.query.unifiedProduct.findMany({
			with: {
				shopifyMetadata: true,
				shopifyRowContent: true,
				uniref: true,
				shopifyMedia: true
			}
		});
		const images = await tx.query.images.findMany({
			columns: {
				sourceURL: true,
				filePath: true,
				uploadedTime: true,
				sourceHash: true
			},
			where: (images, { eq }) => eq(images.isThumbnail, false)
		});
		return { products, images };
	});
}

function createImageMap(images: Awaited<ReturnType<typeof fetchData>>['images']): ImageMap {
	const imageMap: ImageMap = new Map();
	for (const image of images) {
		if (image.sourceURL) imageMap.set(image.sourceURL, image);
	}
	return imageMap;
}

function prepareUploads(
	products: Awaited<ReturnType<typeof fetchData>>['products'],
	imageMap: ImageMap
) {
	const { toUploadUpdate, toUploadNew } = diffUpload(products, { imageMap });

	return [
		...toUploadNew.map((u) => ({ ...u, identifier: undefined }))
		// ...toUploadUpdate.map((u) => ({
		// 	...u,
		// 	identifier: { id: u.product.shopifyRowContent!.productId }
		// }))
	]
		.filter((u) => {
			const meta = u.product.shopifyMetadata;
			if (!meta) return true;
			if (meta.status === 'PENDING') return false;
			return u.product.lastUpdated > meta.lastUpdated;
		})
		.slice(0, 1); // LIMIT FOR TESTING ONLY
}

type UploadItem = ReturnType<typeof prepareUploads>[number];

async function markBatchPending(batch: UploadItem[]) {
	await db.transaction(async (tx) => {
		for (const item of batch) {
			await tx
				.insert(shopifyMetadata)
				.values({
					productId: item.product.id,
					lastUpdated: item.product.lastUpdated,
					status: 'PENDING',
					failureCount: 0
				})
				.onConflictDoUpdate({
					target: shopifyMetadata.productId,
					set: {
						status: 'PENDING',
						lastUpdated: item.product.lastUpdated
					}
				});
		}
	});
}

async function processBatchResults(
	results: { data: ProductPushMutation; __lineNumber: number }[],
	batch: UploadItem[]
) {
	console.log(JSON.stringify(results, null, 2));
	await db.transaction(async (tx) => {
		for (let j = 0; j < results.length; j++) {
			const result = results[j].data;
			const item = batch[j];

			if (
				(result.productSet?.userErrors && result.productSet.userErrors.length > 0) ||
				!result.productSet?.product
			) {
				console.error(
					`Failed to upload product ${item.product.id}:`,
					JSON.stringify(result.productSet?.userErrors)
				);
				await tx
					.update(shopifyMetadata)
					.set({
						status: 'FAILED',
						failureCount: (item.product.shopifyMetadata?.failureCount ?? 0) + 1
					})
					.where(eq(shopifyMetadata.productId, item.product.id));
				continue;
			}

			const product = result.productSet.product;

			await tx
				.update(shopifyMetadata)
				.set({
					status: 'UPLOADED',
					shopifyProductId: product.id
				})
				.where(eq(shopifyMetadata.productId, item.product.id));

			// Handle Media
			if (item.newMedia.length > 0 && product.media?.nodes) {
				for (const mediaNode of product.media.nodes) {
					const originalUrl =
						'originalSource' in mediaNode ? mediaNode.originalSource?.url : undefined;

					if (!originalUrl) continue;

					const matchedMedia = item.newMedia.find((nm) => nm.originalSource === originalUrl);

					if (matchedMedia) {
						await tx
							.insert(shopifyMedia)
							.values({
								originalUploadUrl: matchedMedia.originalSource,
								status:
									mediaNode.status === 'UPLOADED' || mediaNode.status === 'READY'
										? 'UPLOADED'
										: 'PROCESSING',
								shopifyMediaId: mediaNode.id,
								productId: item.product.id
							})
							.onConflictDoUpdate({
								target: shopifyMedia.shopifyMediaId,
								set: {
									status:
										mediaNode.status === 'UPLOADED' || mediaNode.status === 'READY'
											? 'UPLOADED'
											: 'PROCESSING'
								}
							});
					}
				}
			}
		}
	});
}

async function markBatchFailed(batch: UploadItem[]) {
	await db.transaction(async (tx) => {
		for (const item of batch) {
			await tx
				.update(shopifyMetadata)
				.set({ status: 'FAILED' })
				.where(eq(shopifyMetadata.productId, item.product.id));
		}
	});
}
