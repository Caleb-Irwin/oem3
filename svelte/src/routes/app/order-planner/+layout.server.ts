import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { client } }) => ({
	orderPlanner: await client.orderPlanner.get.query()
});
