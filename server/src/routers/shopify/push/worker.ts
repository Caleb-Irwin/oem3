import { db } from '../../../db';
import { work } from '../../../utils/workerBase';
import { diffUpload } from './diffUpload';
import type { ImageMap } from './types';
import { executeBulkMutation } from '../bulk';
import { shopifyMetadata } from './shopifyMetadata.table';
import { shopifyMedia } from './media.table';
import { eq } from 'drizzle-orm';
import type { ProductPushMutation } from '../../../../types/admin.generated';
import { appRouter } from '../../../appRouter';
import { TRPCError } from '@trpc/server';

work({
	process: async ({ progress }) => {
		progress(-1);

		const { products, images } = await fetchData();
		const imageMap = createImageMap(images);
		const allUploads = prepareUploads(products, imageMap);

		console.log(`Preparing to upload ${allUploads.length} products to Shopify.`);

		throw new TRPCError({
			code: 'FORBIDDEN',
			message: `Shopify uploads are currently disabled. ${allUploads.length} products were ready to upload.`
		});

		const batchSize = 256; // Arbitrary
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

		progress(-1);

		await appRouter
			.createCaller({
				user: {
					username: 'admin',
					permissionLevel: 'general',
					exp: Date.now() + 1000,
					iat: Date.now() - 1000
				}
			})
			.shopify.files.cloudDownload({});
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
		...toUploadUpdate.map((u) => ({
			...u,
			identifier: { id: u.product.shopifyRowContent!.productId }
		})),
		...toUploadNew.map((u) => ({ ...u, identifier: undefined }))
	].filter((u) => {
		// // Only upload a subset of new products
		// if (!u.product.shopifyRowContent && u.product.inFlyer === false) {
		// 	if (u.product.id % 10 !== 0) return false;
		// }

		const meta = u.product.shopifyMetadata;
		if (!meta) {
			if (u.product.deleted || u.product.status === 'DISABLED') return false;
			return true;
		} else if (!u.product.shopifyRowContent && meta.status === 'UPLOADED') {
			return false;
		}

		if (u.product.lastUpdated <= meta.lastUpdated && meta.status !== 'FAILED') return false;

		if (meta.lastUploadedHash && meta.lastUploadedHash === u.hash && meta.status === 'UPLOADED') {
			return false;
		}

		if (meta.failureCount >= 3) {
			console.error(
				`Skipping product ${u.product.id} (${[u.product.gid, u.product.sprc].filter(Boolean).join(' ')}) due to ${meta.failureCount} previous failures.`
			);
			return false;
		}

		return true;
	});
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
					shopifyProductId: item.product.shopifyRowContent?.productId || null,
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
	const batchHandleMap = new Map<string, UploadItem>(
		batch.map((item) => [item.productSetInput.handle!, item])
	);

	await db.transaction(async (tx) => {
		const missingHandles = new Set<string>(batchHandleMap.keys());

		for (let j = 0; j < results.length; j++) {
			const result = results[j].data;
			const handle = result.productSet?.product?.handle;
			if (!handle) {
				console.error('No handle in result:', JSON.stringify(result.productSet));
				continue;
			}
			const item = batchHandleMap.get(handle)!;
			missingHandles.delete(handle);
			if (
				item.product.shopifyRowContent?.productId &&
				result.productSet?.product?.id !== item.product.shopifyRowContent?.productId
			) {
				throw new Error(
					`Mismatched product IDs in result processing: expected ${item.product.shopifyRowContent?.productId}, got ${result.productSet?.product?.id}`
				);
			}

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
				if (result.productSet?.userErrors[0]?.field?.includes('files')) {
					await tx.delete(shopifyMedia).where(eq(shopifyMedia.productId, item.product.id));
				}

				continue;
			}

			const product = result.productSet.product;

			await tx
				.update(shopifyMetadata)
				.set({
					status: 'UPLOADED',
					shopifyProductId: product.id,
					failureCount: 0,
					lastUploadedHash: item.hash
				})
				.where(eq(shopifyMetadata.productId, item.product.id));

			// Handle Media
			if (item.newMedia.length > 0 && product.media?.nodes) {
				for (const [i, mediaNode] of product.media.nodes.entries()) {
					const matchedMedia = item.newMedia.find((nm) => nm.index === i);

					if (matchedMedia) {
						await tx
							.insert(shopifyMedia)
							.values({
								originalUploadUrl: matchedMedia.originalSource,
								status: mediaNode.status,
								shopifyMediaId: mediaNode.id,
								productId: item.product.id
							})
							.onConflictDoUpdate({
								target: shopifyMedia.shopifyMediaId,
								set: {
									status: mediaNode.status
								}
							});
					}
				}
			}
		}

		for (const handle of missingHandles) {
			const item = batchHandleMap.get(handle)!;
			console.error(`Marking product ${item.product.id} as FAILED due to missing result.`);
			await tx
				.update(shopifyMetadata)
				.set({
					status: 'FAILED',
					failureCount: (item.product.shopifyMetadata?.failureCount ?? 0) + 1
				})
				.where(eq(shopifyMetadata.productId, item.product.id));
		}
	});
}

async function markBatchFailed(batch: UploadItem[]) {
	console.error('Entire batch failed, marking all as FAILED.');
	await db.transaction(async (tx) => {
		for (const item of batch) {
			await tx
				.update(shopifyMetadata)
				.set({ status: 'FAILED' })
				.where(eq(shopifyMetadata.productId, item.product.id));
		}
	});
}
