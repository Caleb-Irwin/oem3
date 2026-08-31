import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { client } }) => ({
	orderPlanner: await client.orderPlanner.get.query()
});
