import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { client } }) => {
	const [orderPlanner, smartOrderSummary] = await Promise.all([
		client.orderPlanner.get.query(),
		client.orderPlanner.smartOrder.summary.query()
	]);
	return { orderPlanner, smartOrderSummary };
};
