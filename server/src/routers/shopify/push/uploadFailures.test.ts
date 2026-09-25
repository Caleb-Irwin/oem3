import { describe, expect, test } from 'bun:test';
import {
	isFilesError,
	matchNewMedia,
	parseUploadErrors,
	retryableUploadFailure,
	serializeUploadErrors,
	shouldOmitFiles,
	successfulUploadState,
	uploadAttemptState,
	uploadSkipReason
} from './uploadFailures';

const filesError = serializeUploadErrors([
	{ field: ['input', 'files'], message: 'Media ids [1] do not exist' }
]);

const meta = {
	status: 'UPLOADED' as 'UPLOADED' | 'FAILED' | 'PENDING',
	lastUpdated: 100,
	failureCount: 0,
	lastUploadedHash: 'a',
	lastError: null as string | null,
	shopifyProductId: 'gid://shopify/Product/1' as string | null
};
const upload = { lastUpdated: 100, onShopify: true, hash: 'b' };

describe('uploadSkipReason', () => {
	test('sends products that have never been uploaded', () => {
		expect(uploadSkipReason(upload, null)).toBeNull();
		const failedCreate = { ...meta, status: 'FAILED' as const, shopifyProductId: null };
		expect(uploadSkipReason({ ...upload, onShopify: false }, failedCreate)).toBeNull();
	});

	test('skips uploaded products that have not changed', () => {
		expect(uploadSkipReason(upload, meta)).toBe('unchanged');
		expect(uploadSkipReason({ ...upload, lastUpdated: 200, hash: 'a' }, meta)).toBe('sameHash');
		expect(uploadSkipReason({ ...upload, lastUpdated: 200 }, meta)).toBeNull();
	});

	test('retries products left pending by an interrupted push', () => {
		expect(uploadSkipReason(upload, { ...meta, status: 'PENDING' })).toBeNull();
	});

	test('waits for the Shopify sync after creating a listing', () => {
		expect(uploadSkipReason({ ...upload, onShopify: false, lastUpdated: 200 }, meta)).toBe(
			'notSynced'
		);
	});

	test('retries failed products until they have failed 3 times', () => {
		const failed = { ...meta, status: 'FAILED' as const, failureCount: 2 };
		expect(uploadSkipReason(upload, failed)).toBeNull();
		expect(uploadSkipReason(upload, { ...failed, failureCount: 3 })).toBe('failing');
	});

	test('retries products that keep failing once they change', () => {
		const failing = { ...meta, status: 'FAILED' as const, failureCount: 5 };
		expect(uploadSkipReason({ ...upload, lastUpdated: 200 }, failing)).toBeNull();
	});
});

describe('upload recovery', () => {
	test('omitted images stay retryable through the manual reset and are not hashed as uploaded', () => {
		const partial = { ...meta, ...successfulUploadState(upload.hash, true, filesError) };
		expect(partial.status).toBe('FAILED');
		expect(partial.lastUploadedHash).toBeNull();
		expect(isFilesError(parseUploadErrors(partial.lastError))).toBe(true);
		expect(uploadSkipReason(upload, partial)).toBe('failing');

		// resetFailedUploads resets the count on FAILED rows, including this partial success.
		const reset = { ...partial, failureCount: 0 };
		expect(uploadSkipReason(upload, reset)).toBeNull();
		// A listing created without images waits for the Shopify sync rather than being created again
		expect(uploadSkipReason({ ...upload, onShopify: false }, reset)).toBe('notSynced');
		expect(shouldOmitFiles(reset)).toBe(false);
		const complete = { ...reset, ...successfulUploadState(upload.hash, false, reset.lastError) };
		expect(complete.status).toBe('UPLOADED');
		expect(complete.lastError).toBeNull();
		expect(complete.lastUploadedHash).toBe(upload.hash);
	});

	test('a changed product gets all recovery attempts after exhausting its previous budget', () => {
		const exhausted = {
			...meta,
			status: 'FAILED' as const,
			failureCount: 5,
			lastError: filesError
		};
		const changed = { ...upload, lastUpdated: 200 };
		expect(uploadSkipReason(changed, exhausted)).toBeNull();
		const attempt = uploadAttemptState(changed.lastUpdated, exhausted);
		expect(attempt).toEqual({ failureCount: 0, lastError: null });
		expect(shouldOmitFiles({ ...exhausted, ...attempt })).toBe(false);

		// The first attempt fails on stale IDs. The next must resend the cleared media.
		const firstFailure = {
			...exhausted,
			lastUpdated: changed.lastUpdated,
			failureCount: attempt.failureCount + 1,
			lastError: filesError
		};
		expect(uploadSkipReason(changed, firstFailure)).toBeNull();
		expect(shouldOmitFiles(firstFailure)).toBe(false);
		const secondFailure = { ...firstFailure, failureCount: 2 };
		expect(uploadSkipReason(changed, secondFailure)).toBeNull();
		expect(shouldOmitFiles(secondFailure)).toBe(true);
	});

	test('repeated infrastructure failures do not exhaust retries or erase media recovery', () => {
		let state = { ...meta, status: 'FAILED' as const, failureCount: 2, lastError: filesError };
		for (const message of [
			'Upload timeout',
			'Polling failed',
			'Download failed',
			'Saving results failed'
		]) {
			const attempt = uploadAttemptState(upload.lastUpdated, state);
			state = { ...state, ...attempt, ...retryableUploadFailure(attempt.lastError, message) };
			expect(state.failureCount).toBe(2);
			expect(uploadSkipReason(upload, state)).toBeNull();
			expect(shouldOmitFiles(state)).toBe(true);
			expect(parseUploadErrors(state.lastError)).toHaveLength(2);
		}
	});
});

describe('upload errors', () => {
	test('detects media errors in any position', () => {
		expect(
			isFilesError([
				{ field: ['input', 'title'], message: 'Title is too long' },
				{ field: ['input', 'files'], message: 'Media ids [1] do not exist' }
			])
		).toBe(true);
		expect(isFilesError([{ field: null, message: 'Missing from bulk mutation results' }])).toBe(
			false
		);
	});

	test('round trips errors and tolerates plain text', () => {
		expect(parseUploadErrors(filesError)).toEqual([
			{ field: ['input', 'files'], message: 'Media ids [1] do not exist' }
		]);
		expect(parseUploadErrors('boom')).toEqual([{ message: 'boom' }]);
		expect(parseUploadErrors(null)).toEqual([]);
	});

	test('sends without files after media fails twice in a row', () => {
		const failed = { ...meta, status: 'FAILED' as const, lastError: filesError };
		expect(shouldOmitFiles({ ...failed, failureCount: 1 })).toBe(false);
		expect(shouldOmitFiles({ ...failed, failureCount: 2 })).toBe(true);
		expect(shouldOmitFiles({ ...failed, failureCount: 2, lastError: '[]' })).toBe(false);
		expect(shouldOmitFiles({ ...meta, failureCount: 2, lastError: filesError })).toBe(false);
	});
});

describe('matchNewMedia', () => {
	const nodes = [{ id: 'm0' }, { id: 'm1' }, { id: 'm2' }];

	test('pairs new files with the media at the same position', () => {
		expect(matchNewMedia([{ originalSource: 'b', index: 1 }], 3, nodes)).toEqual([
			{ originalSource: 'b', node: { id: 'm1' } }
		]);
	});

	test('does not pair anything when the media count differs', () => {
		expect(matchNewMedia([{ originalSource: 'b', index: 1 }], 4, nodes)).toBeNull();
		expect(matchNewMedia([], 4, nodes)).toEqual([]);
	});
});
