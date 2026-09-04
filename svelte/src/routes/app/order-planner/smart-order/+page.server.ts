import type { PageServerLoad } from './$types';

// The layout already loads and subscribes to the planner itself, so only the Smart Order
// payload is fetched here; the order list comes from the planner context.
export const load: PageServerLoad = async ({ locals: { client } }) => ({
	smartOrder: await client.orderPlanner.smartOrder.get.query()
});
