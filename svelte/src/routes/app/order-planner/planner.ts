import { getContext, setContext } from 'svelte';
import type { Readable } from 'svelte/store';
import type { OrderPlannerData, OrderPlannerItemData, OrderPlannerOrder } from './types';

export type AssignItems = (itemIds: number[], orderId: number | null) => Promise<void>;

export interface PlannerContext {
	/** Live planner snapshot, seeded by the layout's server load so it is never undefined. */
	data: Readable<OrderPlannerData>;
	canEdit: boolean;
	/** Moves items into an order, or back to the unassigned list with `null`. */
	assign: AssignItems;
}

const PLANNER_KEY = Symbol('order-planner');

export function setPlannerContext(context: PlannerContext) {
	setContext(PLANNER_KEY, context);
}

export function getPlannerContext() {
	return getContext<PlannerContext>(PLANNER_KEY);
}

export function statusLabel(status: OrderPlannerOrder['status']) {
	return status === 'draft' ? 'Open' : status === 'sent' ? 'Sent' : 'Completed';
}

export function statusClass(status: OrderPlannerOrder['status']) {
	return status === 'draft'
		? 'variant-soft-warning'
		: status === 'sent'
			? 'variant-soft-primary'
			: 'variant-soft-success';
}

/** Vendor-grouped items, sorted by vendor, for every list the planner renders. */
export function groupByVendor(items: OrderPlannerItemData[]) {
	const grouped = new Map<string, OrderPlannerItemData[]>();
	for (const item of items) {
		const vendor = item.vendor || 'No preferred vendor';
		grouped.set(vendor, [...(grouped.get(vendor) ?? []), item]);
	}
	return [...grouped.entries()]
		.map(([vendor, vendorItems]) => ({ vendor, items: vendorItems }))
		.sort((a, b) => a.vendor.localeCompare(b.vendor));
}

/** Matches an item against an already trimmed, lowercased filter query. */
export function matchesQuery(item: OrderPlannerItemData, query: string) {
	if (!query) return true;
	return [
		item.description,
		item.productName,
		item.qbId,
		item.upc,
		item.vendor,
		item.orderName
	].some((value) => value?.toLowerCase().includes(query) ?? false);
}

/** Other unfinished orders that already hold the same product as `item`. */
export function ordersForItem(
	data: OrderPlannerData,
	item: OrderPlannerItemData,
	excludedOrderId?: number | null
) {
	const orderIds = new Set(
		data.items
			.filter((candidate) => candidate.qbRow === item.qbRow && candidate.orderId !== null)
			.map((candidate) => candidate.orderId)
	);
	return data.orders.filter(
		(order) =>
			order.status !== 'completed' && orderIds.has(order.id) && order.id !== excludedOrderId
	);
}

/** Adds or removes one id, keeping the selection unique. */
export function toggleId(ids: number[], id: number, selected: boolean) {
	return selected ? [...new Set([...ids, id])] : ids.filter((current) => current !== id);
}

/** Selects a whole group, or clears it when every member is already selected. */
export function toggleGroup(ids: number[], groupIds: number[]) {
	return groupIds.every((id) => ids.includes(id))
		? ids.filter((id) => !groupIds.includes(id))
		: [...new Set([...ids, ...groupIds])];
}
