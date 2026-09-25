import type { shopifyMetadata } from './shopifyMetadata.table';

type Metadata = Pick<
	typeof shopifyMetadata.$inferSelect,
	'status' | 'lastUpdated' | 'failureCount' | 'lastUploadedHash' | 'lastError' | 'shopifyProductId'
>;

/** After this many failures in a row, a product is only retried once it changes again. */
export const MAX_UPLOAD_FAILURES = 3;

/** A changed product gets a fresh budget, including another attempt with its files. */
export function uploadAttemptState(lastUpdated: number, meta: Metadata | null | undefined) {
	if (!meta || lastUpdated > meta.lastUpdated) return { failureCount: 0, lastError: null };
	return { failureCount: meta.failureCount, lastError: meta.lastError };
}

export function successfulUploadState(
	hash: string,
	filesOmitted: boolean,
	lastError: string | null
) {
	return filesOmitted
		? {
				status: 'FAILED' as const,
				failureCount: MAX_UPLOAD_FAILURES,
				lastUploadedHash: null,
				lastError: serializeUploadErrors([
					...parseUploadErrors(lastError),
					{
						field: ['input', 'files'],
						message: 'Product updated without files. Retry to upload images.'
					}
				])
			}
		: { status: 'UPLOADED' as const, failureCount: 0, lastUploadedHash: hash, lastError: null };
}

/** Preserve the media recovery step across transport or local persistence failures. */
export function retryableUploadFailure(lastError: string | null, message: string) {
	return {
		status: 'FAILED' as const,
		lastError: serializeUploadErrors([
			...parseUploadErrors(lastError).filter((error) => isFilesError([error])),
			{ message }
		])
	};
}

export interface UploadError {
	field?: string[] | null;
	message: string;
}

export type UploadSkipReason = 'notSynced' | 'unchanged' | 'sameHash' | 'failing';

/** Why an upload should be skipped this run, or null if it should be sent. */
export function uploadSkipReason(
	upload: { lastUpdated: number; onShopify: boolean; hash: string },
	meta: Metadata | null | undefined
): UploadSkipReason | null {
	if (!meta) return null;
	// Created on Shopify, but the Shopify sync has not picked it up yet. Sending it again would
	// create a duplicate listing.
	if (!upload.onShopify && (meta.status === 'UPLOADED' || meta.shopifyProductId))
		return 'notSynced';

	const changed = upload.lastUpdated > meta.lastUpdated;
	// PENDING is retried too: it means a push stopped before saving this product's result
	if (!changed && meta.status === 'UPLOADED') return 'unchanged';
	if (meta.status === 'UPLOADED' && meta.lastUploadedHash === upload.hash) return 'sameHash';
	if (meta.failureCount >= MAX_UPLOAD_FAILURES && !changed) return 'failing';
	return null;
}

export function isFilesError(errors: UploadError[]): boolean {
	return errors.some((e) => e.field?.includes('files'));
}

export function serializeUploadErrors(errors: UploadError[]): string {
	return JSON.stringify(errors.map(({ field, message }) => ({ field: field ?? null, message })));
}

export function parseUploadErrors(lastError: string | null | undefined): UploadError[] {
	if (!lastError) return [];
	try {
		const parsed = JSON.parse(lastError);
		return Array.isArray(parsed) ? parsed : [{ message: lastError }];
	} catch {
		return [{ message: lastError }];
	}
}

/**
 * The saved media is cleared after the first media error and the images are sent again. If
 * that also fails on media, the product is sent without files so everything else still updates.
 */
export function shouldOmitFiles(meta: Metadata | null | undefined): boolean {
	return (
		meta?.status === 'FAILED' &&
		meta.failureCount >= 2 &&
		isFilesError(parseUploadErrors(meta.lastError))
	);
}

/**
 * Pairs the newly uploaded files with the media Shopify returned. Media is matched by position,
 * so nothing is paired unless Shopify returned exactly one media item per file sent.
 */
export function matchNewMedia<N extends { id: string }>(
	newMedia: { originalSource: string; index: number }[],
	fileCount: number,
	nodes: N[]
): { originalSource: string; node: N }[] | null {
	if (newMedia.length === 0) return [];
	if (nodes.length !== fileCount) return null;
	return newMedia.map((m) => ({ originalSource: m.originalSource, node: nodes[m.index] }));
}
