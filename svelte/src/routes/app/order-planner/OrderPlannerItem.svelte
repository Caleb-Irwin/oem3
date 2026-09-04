<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import CreateOrder from './CreateOrder.svelte';
	import InventoryChart from './InventoryChart.svelte';
	import ItemIdentity from './ItemIdentity.svelte';
	import QuantityTiles from './QuantityTiles.svelte';
	import type { OrderPlannerItemData, OrderPlannerOrder } from './types';

	interface Props {
		item: OrderPlannerItemData;
		orders: OrderPlannerOrder[];
		canEdit: boolean;
		selected?: boolean;
		onSelect?: (selected: boolean) => void;
		onAssign: (itemIds: number[], orderId: number | null) => Promise<void>;
		showRemove?: boolean;
		duplicateOrders?: OrderPlannerOrder[];
	}

	let {
		item,
		orders,
		canEdit,
		selected = false,
		onSelect,
		onAssign,
		showRemove = true,
		duplicateOrders = []
	}: Props = $props();
	const modalStore = getModalStore();

	const itemName = $derived(item.description || item.productName || item.qbId);
	const resourceHref = $derived(
		item.uniId ? `/app/resource/${item.uniId}/unified` : `/app/resource/redirect/qb-${item.qbRow}`
	);
	const dateAdded = $derived(
		new Intl.DateTimeFormat('en-CA', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(item.addedAt)
	);

	function statusLabel(status: OrderPlannerOrder['status']) {
		return status === 'draft' ? 'Open' : status === 'sent' ? 'Sent' : 'Completed';
	}

	function openCreateOrder() {
		modalStore.trigger({
			type: 'component',
			component: {
				ref: CreateOrder,
				props: {
					res: async (order: OrderPlannerOrder) => onAssign([item.id], order.id)
				}
			}
		});
	}

	async function changeOrder(event: Event & { currentTarget: HTMLSelectElement }) {
		const value = event.currentTarget.value;
		if (value === 'create') {
			event.currentTarget.value = item.orderId?.toString() ?? '';
			openCreateOrder();
			return;
		}
		await onAssign([item.id], value ? Number(value) : null);
	}
</script>

<article
	class="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800"
>
	<div class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
		<ItemIdentity
			name={itemName}
			href={resourceHref}
			qbId={item.qbId}
			upc={item.upc}
			image={item.primaryImage}
			imageDescription={item.primaryImageDescription}
			{selected}
			onSelect={onSelect ? (next) => onSelect(next) : undefined}
		>
			{#snippet meta()}Added {dateAdded} by {item.addedBy}{/snippet}
		</ItemIdentity>

		<QuantityTiles
			quantityOnHand={item.quantityOnHand}
			availableQuantity={item.availableQuantity}
			quantityOnPurchaseOrder={item.quantityOnPurchaseOrder}
			quantityOnSalesOrder={item.quantityOnSalesOrder}
		/>

		<InventoryChart
			history={item.history.map((point) => ({
				recordedAt: point.recordedAt,
				value: point.quantityOnHand
			}))}
			current={item.quantityOnHand}
		/>

		<div class="min-w-0 lg:w-56 lg:shrink-0">
			{#if duplicateOrders.length > 0}
				<div
					class="mb-1.5 flex items-start gap-1.5 rounded-md border border-warning-400 bg-warning-50 px-2 py-1.5 text-xs text-warning-950 dark:border-warning-600 dark:bg-warning-900/30 dark:text-warning-100"
				>
					<TriangleAlert class="mt-0.5 shrink-0" size={14} />
					<span>
						Already in
						{duplicateOrders
							.map((order) => `${order.name} (${statusLabel(order.status)})`)
							.join(', ')}.
					</span>
				</div>
			{/if}

			<!-- Items in a finished order are history, so even editors only get a read-only label. -->
			{#if canEdit && item.orderStatus !== 'completed'}
				<div class="flex min-w-0 items-center gap-1">
					<label class="min-w-0 flex-1">
						<span class="sr-only">Order for {itemName}</span>
						<select class="select w-full text-sm" value={item.orderId ?? ''} onchange={changeOrder}>
							<option value="">Not in an order</option>
							<option value="create">+ Create a new order…</option>
							{#each orders.filter((order) => order.status !== 'completed' || order.id === item.orderId) as order (order.id)}
								<option value={order.id} disabled={order.status === 'completed'}>
									{order.name} ({statusLabel(order.status)})
								</option>
							{/each}
						</select>
					</label>
					{#if showRemove}
						<Button
							action={client.orderPlanner.remove}
							input={{ id: item.id }}
							confirm="Remove this item from Order Planner?"
							successMessage="Item removed"
							class="btn btn-icon shrink-0 variant-ghost-error"
						>
							<Trash2 size={18} />
							<span class="sr-only">Remove {itemName}</span>
						</Button>
					{/if}
				</div>
			{:else if item.orderName && item.orderStatus}
				<p class="text-sm text-surface-700 dark:text-surface-200">
					{item.orderName} ({statusLabel(item.orderStatus)})
				</p>
			{/if}
		</div>
	</div>
</article>
