import type { client } from '$lib/client';

export type OrderPlannerData = Awaited<ReturnType<typeof client.orderPlanner.get.query>>;
export type OrderPlannerItemData = OrderPlannerData['items'][number];
export type OrderPlannerOrder = OrderPlannerData['orders'][number];
/** One paged row of the finished-order history: an order plus its item count. */
export type CompletedOrder = Awaited<ReturnType<typeof client.orderPlanner.history.query>>[number];
