import { promiseAllObject } from '$lib/promiseAllObject';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { client } }) => {
	return await promiseAllObject({
		// Product Worker
		productWorkerStatus: client.product.worker.status.query(),

		// Product Error Summary
		productErrorSummary: client.summaries.get.query({ type: 'unifiedProduct' })
	});
};
