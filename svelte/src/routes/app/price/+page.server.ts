import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { client } }) => {
	return {
		prices: await client.product.priceList.list.query()
	};
};
