import { promiseAllObject } from '$lib/promiseAllObject';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { client } }) => {
	return await promiseAllObject({
		priceChanges: client.priceChanges.get.query({ category: 'all' }),
		exports: client.priceChanges.exports.list.query()
	});
};
