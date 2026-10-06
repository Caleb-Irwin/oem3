import { db, type Tx } from '../../../db';
import { work } from '../../../utils/workerBase';
import { diffUpload } from './diffUpload';
import { newListingHoldReason, type ListingHoldReason } from './listingEligibility';
import { PushWorkerMessage, type ImageMap, type PushHostMessage } from './types';
import {
	downloadBulkResults,
	executeBulkMutation,
	getCurrentBulkOperation,
	waitForBulkOperation
} from '../bulk';
import { shopifyMetadata } from './shopifyMetadata.table';
import { shopifyMedia } from './media.table';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { shopifyPushRuns } from './pushRuns.table';
import { getErrorMessage } from '../../../utils/dbErrors';
import { KV } from '../../../utils/kv';
import { unifiedProduct } from '../../product/table';
import type { ProductPushMutation } from '../../../../types/admin.generated';
import type { ProductSetInput } from '../../../../types/admin.types';
import { archiveUnmatchedListings } from './archiveUnmatched';
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

/**
 * A batch whose results have not been saved yet. Line N of its results is productIds[N]. Saved
 * before the bulk mutation starts, so a push that stops at any point leaves a record of it.
 */
type PendingBatch = {
	productIds: number[];
	// Null until Shopify accepts the operation and its ID is saved
	operationId: string | null;
	// The latest bulk mutation before this batch, to tell whether this batch's one started
	previousOperationId: string | null;
};

const pendingBatchKv = (database: typeof db | Tx = db) =>
	new KV<'pendingBatch'>('shopifyPush', database);

type RunResults = Required<
	Pick<
		typeof shopifyPushRuns.$inferInsert,
		'created' | 'updated' | 'failed' | 'archived' | 'recovered'
	>
> &
	Pick<typeof shopifyPushRuns.$inferInsert, 'skipped' | 'heldBack'>;

work({
	process: async ({ message, progress, utils: { customMessage } }) => {
		const runId = await startRun((message as PushHostMessage).trigger ?? 'manual');
		customMessage(PushWorkerMessage.RunsChanged);
		const results: RunResults = { created: 0, updated: 0, failed: 0, archived: 0, recovered: 0 };
		let syncNeeded: boolean;
		try {
			syncNeeded = await push(progress, results);
		} catch (e) {
			await finishRun(runId, { status: 'failed', ...results, error: getErrorMessage(e) });
			customMessage(PushWorkerMessage.RunsChanged);
			throw e;
		}
		customMessage(syncNeeded ? PushWorkerMessage.SyncNeeded : PushWorkerMessage.SyncNotNeeded);
		await finishRun(runId, { status: 'completed', ...results });
		customMessage(PushWorkerMessage.RunsChanged);
	}
});

/** Records a new run. Only one push runs at a time, so any other unfinished run was cut off. */
async function startRun(trigger: (typeof shopifyPushRuns.$inferInsert)['trigger']) {
	return await db.transaction(async (tx) => {
		await tx
			.update(shopifyPushRuns)
			.set({ status: 'interrupted' })
			.where(eq(shopifyPushRuns.status, 'running'));
		const [{ id }] = await tx
			.insert(shopifyPushRuns)
			.values({ trigger, status: 'running', startedAt: Date.now() })
			.returning({ id: shopifyPushRuns.id });
		return id;
	});
}

/** Failing to record the result must not fail a push or hide the error that ended it */
async function finishRun(
	runId: number,
	update: RunResults & Pick<typeof shopifyPushRuns.$inferInsert, 'status' | 'error'>
) {
	try {
		await db
			.update(shopifyPushRuns)
			.set({ ...update, finishedAt: Date.now() })
			.where(eq(shopifyPushRuns.id, runId));
	} catch (e) {
		console.error(`Saving the result of push run ${runId} failed:`, e);
	}
}

/**
 * Fills in results as it goes, so a failed push still records what it did. Returns whether it
 * changed listings, or recovered ones, that the Shopify sync has to pull.
 */
async function push(progress: (percentDone: number) => void, results: RunResults) {
	progress(-1);

	results.recovered = await recoverPendingBatch();
	let syncNeeded = results.recovered > 0;

	const { products, images } = await fetchData();
	const imageMap = createImageMap(images);
	const { uploads: allUploads, skipped, heldBack } = prepareUploads(products, imageMap);
	results.skipped = JSON.stringify(skipped);
	results.heldBack = JSON.stringify(heldBack);

	console.log(`Preparing to upload ${allUploads.length} products to Shopify.`);

	// throw new TRPCError({
	// 	code: 'FORBIDDEN',
	// 	message: `Shopify uploads are currently disabled. ${allUploads.length} products were ready to upload.`
	// });

	const batchSize = 256; // Arbitrary
	for (let i = 0; i < allUploads.length; i += batchSize) {
		const batch = await markBatchPending(allUploads.slice(i, i + batchSize));
		if (batch.length === 0) continue;
		syncNeeded = true;

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
		// Shopify, so later batches would fail too. The next push recovers its results.
		let batchResults: BulkResultLine[];
		try {
			const pending: PendingBatch = {
				productIds: batch.map((item) => item.product.id),
				operationId: null,
				previousOperationId: (await getCurrentBulkOperation('mutation'))?.id ?? null
			};
			await pendingBatchKv().set('pendingBatch', JSON.stringify(pending));
			batchResults = await executeBulkMutation(
				mutation,
				variables,
				undefined,
				undefined,
				undefined,
				async (operationId) => {
					try {
						await pendingBatchKv().set(
							'pendingBatch',
							JSON.stringify({ ...pending, operationId } satisfies PendingBatch)
						);
					} catch (e) {
						// Recovery can still find the operation, so keep waiting for its results
						console.error(`Saving the ID of bulk mutation ${operationId} failed:`, e);
					}
				}
			);
		} catch (e) {
			console.error('Bulk mutation failed:', e);
			results.failed += batch.length;
			await markBatchFailed(batch, `Bulk mutation failed: ${e}`);
			throw e;
		}
		try {
			const counts = await processBatchResults(batchResults, batch);
			results.created += counts.created;
			results.updated += counts.updated;
			results.failed += counts.failed;
		} catch (e) {
			// Local persistence failures do not consume the product's validation retry budget.
			console.error('Saving bulk mutation results failed:', e);
			results.failed += batch.length;
			await markBatchFailed(batch, `Saving results failed: ${e}`);
			throw e;
		}

		progress((i + batch.length) / allUploads.length);
	}

	progress(-1);

	results.archived = await archiveUnmatchedListings();
	if (results.archived > 0) syncNeeded = true;

	return syncNeeded;
}

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
	return { uploads, skipped, heldBack };
}

type UploadItem = ReturnType<typeof prepareUploads>['uploads'][number];

/** One line of the bulk results; GraphQL errors for that line come back in `errors` */
type BulkResultLine = {
	data?: ProductPushMutation;
	errors?: { message: string }[];
	__lineNumber: number;
};

/**
 * The unifier deletes orphaned products while a push runs. Locks the batch's products so they
 * cannot be deleted until the transaction ends, and returns only those that still exist.
 */
async function lockExisting(tx: Tx, batch: UploadItem[]) {
	const rows = await tx
		.select({ id: unifiedProduct.id })
		.from(unifiedProduct)
		.where(
			inArray(
				unifiedProduct.id,
				batch.map((item) => item.product.id)
			)
		)
		.for('key share');
	const ids = new Set(rows.map((row) => row.id));
	return batch.filter((item) => ids.has(item.product.id));
}

/** Returns the items that still exist; deleted products are dropped from the batch. */
async function markBatchPending(batch: UploadItem[]) {
	return await db.transaction(async (tx) => {
		const existing = await lockExisting(tx, batch);
		if (existing.length < batch.length) {
			console.log(`Skipping ${batch.length - existing.length} products deleted during the push.`);
		}
		for (const item of existing) {
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
		return existing;
	});
}

/** Returns how many products were created, updated, or failed to upload */
async function processBatchResults(results: BulkResultLine[], batch: UploadItem[]) {
	return await db.transaction(async (tx) => {
		const counts = { created: 0, updated: 0, failed: 0 };
		const unanswered = new Set(batch);
		// Products deleted during the mutation have no rows left to update or attach media to
		const existing = new Set(await lockExisting(tx, batch));

		const markFailed = async (item: UploadItem, errors: UploadError[], countFailure = true) => {
			console.error(`Failed to upload product ${item.product.id}:`, JSON.stringify(errors));
			counts.failed++;
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
			if (!existing.has(item)) {
				console.log(
					`Product ${item.product.id} was deleted during the push; Shopify returned ${result?.productSet?.product?.id ?? 'no product'}.`
				);
				continue;
			}

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
			if (item.identifier) counts.updated++;
			else counts.created++;

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
			if (!existing.has(item)) continue;
			await markFailed(item, [{ message: 'Missing from bulk mutation results' }], false);
		}
		await pendingBatchKv(tx).del('pendingBatch');
		return counts;
	});
}

/**
 * A push that stopped before saving a batch's results may have created listings on Shopify. Saves
 * their IDs so the products are not created again; they are updated once the Shopify sync and
 * unifier link them. Waits for the operation if it is still running. Returns how many it saved.
 */
async function recoverPendingBatch() {
	const saved = await pendingBatchKv().get('pendingBatch');
	if (!saved) return 0;
	const pending: PendingBatch = JSON.parse(saved);
	const { productIds } = pending;
	let operationId = pending.operationId;
	if (!operationId) {
		// The push stopped while starting the operation. Only this worker runs bulk mutations, and
		// it recovers before starting any, so a newer operation than the one before is this batch's.
		const current = await getCurrentBulkOperation('mutation');
		if (!current || current.id === pending.previousOperationId) {
			console.log('An unfinished push batch never started on Shopify; nothing to recover.');
			await pendingBatchKv().del('pendingBatch');
			return 0;
		}
		operationId = current.id;
	}
	console.log(`Recovering the results of unfinished bulk mutation ${operationId}.`);

	const operation = await waitForBulkOperation(operationId);
	const url = operation.url ?? operation.partialDataUrl;
	if (!url) {
		console.error(
			`Bulk mutation ${operationId} ended ${operation.status} without results; any products it created were not recorded.`
		);
		await pendingBatchKv().del('pendingBatch');
		return 0;
	}

	const results = await downloadBulkResults<BulkResultLine>(url);
	return await db.transaction(async (tx) => {
		let recovered = 0;
		for (const { data, __lineNumber } of results) {
			const productId = productIds[__lineNumber];
			const shopifyProductId = data?.productSet?.product?.id;
			if (productId === undefined || !shopifyProductId) continue;
			const updated = await tx
				.update(shopifyMetadata)
				.set({ shopifyProductId })
				.where(
					and(eq(shopifyMetadata.productId, productId), isNull(shopifyMetadata.shopifyProductId))
				)
				.returning({ id: shopifyMetadata.id });
			recovered += updated.length;
		}
		console.log(`Recovered ${recovered} Shopify listings created by ${operationId}.`);
		await pendingBatchKv(tx).del('pendingBatch');
		return recovered;
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
