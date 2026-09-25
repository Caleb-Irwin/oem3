import { db } from '../../../db';
import { work } from '../../../utils/workerBase';
import { diffUpload } from './diffUpload';
import { newListingHoldReason, type ListingHoldReason } from './listingEligibility';
import type { ImageMap } from './types';
import { executeBulkMutation } from '../bulk';
import { shopifyMetadata } from './shopifyMetadata.table';
import { shopifyMedia } from './media.table';
import { eq } from 'drizzle-orm';
import type { ProductPushMutation } from '../../../../types/admin.generated';
import type { ProductSetInput } from '../../../../types/admin.types';
import { appRouter } from '../../../appRouter';
import {
	isFilesError,
	matchNewMedia,
	retryableUploadFailure,
	serializeUploadErrors,
	shouldOmitFiles,
	successfulUploadState,
	uploadAttemptState,
	uploadSkipReason,
	type UploadError,
	type UploadSkipReason
} from './uploadFailures';

work({
	process: async ({ progress }) => {
		progress(-1);

		const { products, images } = await fetchData();
		const imageMap = createImageMap(images);
		const allUploads = prepareUploads(products, imageMap);

		console.log(`Preparing to upload ${allUploads.length} products to Shopify.`);

		// throw new TRPCError({
		// 	code: 'FORBIDDEN',
		// 	message: `Shopify uploads are currently disabled. ${allUploads.length} products were ready to upload.`
		// });

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
							media(first: 250) {
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

			// Batch-level failures stop the run: a timed out operation may still be running on
			// Shopify, so later batches would fail too, and its created products were not recorded.
			let results: BulkResultLine[];
			try {
				results = await executeBulkMutation(mutation, variables);
			} catch (e) {
				console.error('Bulk mutation failed:', e);
				await markBatchFailed(batch, `Bulk mutation failed: ${e}`);
				throw e;
			}
			try {
				await processBatchResults(results, batch);
			} catch (e) {
				// Local persistence failures do not consume the product's validation retry budget.
				console.error('Saving bulk mutation results failed:', e);
				await markBatchFailed(batch, `Saving results failed: ${e}`);
				throw e;
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
	const { toUploadUpdate, toUploadNew: allNew } = diffUpload(products, { imageMap });

	const heldBack: Partial<Record<ListingHoldReason, number>> = {};
	const toUploadNew = allNew.filter((u) => {
		const reason = newListingHoldReason(u.product);
		if (reason) heldBack[reason] = (heldBack[reason] ?? 0) + 1;
		return reason === null;
	});
	console.log('Not creating new Shopify listings for:', heldBack);

	const skipped: Partial<Record<UploadSkipReason, number>> = {};
	const uploads = [
		...toUploadUpdate.map((u) => ({
			...u,
			identifier: { id: u.product.shopifyRowContent!.productId }
		})),
		...toUploadNew.map((u) => ({ ...u, identifier: undefined }))
	]
		.filter((u) => {
			const reason = uploadSkipReason(
				{
					lastUpdated: u.product.lastUpdated,
					onShopify: !!u.product.shopifyRowContent,
					hash: u.hash
				},
				u.product.shopifyMetadata
			);
			if (reason) skipped[reason] = (skipped[reason] ?? 0) + 1;
			if (reason === 'failing') {
				console.error(
					`Skipping product ${u.product.id} (${[u.product.gid, u.product.sprc, u.product.novexco].filter(Boolean).join(' ')}) until it changes, after ${u.product.shopifyMetadata?.failureCount} failures: ${u.product.shopifyMetadata?.lastError}`
				);
			}
			return reason === null;
		})
		.map((u) => {
			const meta = u.product.shopifyMetadata;
			const attempt = uploadAttemptState(u.product.lastUpdated, meta);
			const filesOmitted = shouldOmitFiles(meta && { ...meta, ...attempt });
			if (!filesOmitted) return { ...u, attempt, filesOmitted };
			const productSetInput: ProductSetInput = { ...u.productSetInput };
			delete productSetInput.files;
			return { ...u, attempt, filesOmitted, productSetInput, newMedia: [] };
		});
	console.log('Skipped Shopify uploads:', skipped);
	return uploads;
}

type UploadItem = ReturnType<typeof prepareUploads>[number];

/** One line of the bulk results; GraphQL errors for that line come back in `errors` */
type BulkResultLine = {
	data?: ProductPushMutation;
	errors?: { message: string }[];
	__lineNumber: number;
};

async function markBatchPending(batch: UploadItem[]) {
	await db.transaction(async (tx) => {
		for (const item of batch) {
			await tx
				.insert(shopifyMetadata)
				.values({
					productId: item.product.id,
					lastUpdated: item.product.lastUpdated,
					status: 'PENDING',
					shopifyProductId:
						item.product.shopifyRowContent?.productId ||
						item.product.shopifyMetadata?.shopifyProductId ||
						null,
					...item.attempt
				})
				.onConflictDoUpdate({
					target: shopifyMetadata.productId,
					set: {
						status: 'PENDING',
						lastUpdated: item.product.lastUpdated,
						...item.attempt
					}
				});
		}
	});
}

async function processBatchResults(results: BulkResultLine[], batch: UploadItem[]) {
	await db.transaction(async (tx) => {
		const unanswered = new Set(batch);

		const markFailed = async (item: UploadItem, errors: UploadError[], countFailure = true) => {
			console.error(`Failed to upload product ${item.product.id}:`, JSON.stringify(errors));
			await tx
				.update(shopifyMetadata)
				.set({
					status: 'FAILED',
					failureCount: item.attempt.failureCount + (countFailure ? 1 : 0),
					lastError: countFailure
						? serializeUploadErrors(errors)
						: retryableUploadFailure(
								item.attempt.lastError,
								errors.map((error) => error.message).join('; ')
							).lastError
				})
				.where(eq(shopifyMetadata.productId, item.product.id));
			// Saved media ids can go stale; drop them so the images are sent again next time
			if (isFilesError(errors)) {
				await tx.delete(shopifyMedia).where(eq(shopifyMedia.productId, item.product.id));
			}
		};

		for (const { data: result, errors: lineErrors, __lineNumber } of results) {
			// Input line numbers also identify failures that have no product or handle.
			const item = batch[__lineNumber];
			if (!item) {
				console.error('Result for unknown line:', __lineNumber, JSON.stringify(result?.productSet));
				continue;
			}
			unanswered.delete(item);

			const product = result?.productSet?.product;
			const errors: UploadError[] = [
				...(lineErrors ?? []).map(({ message }) => ({ message })),
				...(result?.productSet?.userErrors ?? [])
			];
			if (errors.length > 0 || !product) {
				await markFailed(
					item,
					errors.length > 0 ? errors : [{ message: 'No product returned' }],
					errors.length > 0
				);
				continue;
			}
			// Guards against results being matched to the wrong product
			const expectedId =
				item.product.shopifyRowContent?.productId || item.product.shopifyMetadata?.shopifyProductId;
			if (expectedId && product.id !== expectedId) {
				await markFailed(item, [
					{ message: `Mismatched product IDs: expected ${expectedId}, got ${product.id}` }
				]);
				continue;
			}
			if (item.productSetInput.handle && product.handle !== item.productSetInput.handle) {
				await markFailed(item, [
					{
						message: `Mismatched handles: sent ${item.productSetInput.handle}, got ${product.handle}`
					}
				]);
				continue;
			}

			await tx
				.update(shopifyMetadata)
				.set({
					shopifyProductId: product.id,
					...successfulUploadState(item.hash, item.filesOmitted, item.attempt.lastError)
				})
				.where(eq(shopifyMetadata.productId, item.product.id));

			const matched = matchNewMedia(
				item.newMedia,
				item.productSetInput.files?.length ?? 0,
				product.media?.nodes ?? []
			);
			if (!matched) {
				console.error(
					`Not saving media for product ${item.product.id}: sent ${item.productSetInput.files?.length} files, got ${product.media?.nodes.length} media`
				);
				continue;
			}
			for (const { originalSource, node } of matched) {
				await tx
					.insert(shopifyMedia)
					.values({
						originalUploadUrl: originalSource,
						status: node.status,
						shopifyMediaId: node.id,
						productId: item.product.id
					})
					.onConflictDoUpdate({
						target: shopifyMedia.shopifyMediaId,
						set: { status: node.status }
					});
			}
		}

		for (const item of unanswered) {
			await markFailed(item, [{ message: 'Missing from bulk mutation results' }], false);
		}
	});
}

async function markBatchFailed(batch: UploadItem[], message: string) {
	console.error(`Marking a batch of ${batch.length} products as FAILED.`);
	await db.transaction(async (tx) => {
		for (const item of batch) {
			await tx
				.update(shopifyMetadata)
				.set(retryableUploadFailure(item.attempt.lastError, message))
				.where(eq(shopifyMetadata.productId, item.product.id));
		}
	});
}
