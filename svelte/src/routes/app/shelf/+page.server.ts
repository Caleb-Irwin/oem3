import { promiseAllObject } from '$lib/promiseAllObject';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { client } }) => {
	return await promiseAllObject({
		allSheets: client.labels.sheet.all.query(),
		lastAccessed: client.labels.allLastAccessed.query()
	});
};
