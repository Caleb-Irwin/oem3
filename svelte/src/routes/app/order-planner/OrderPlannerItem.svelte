<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Button from '$lib/Button.svelte';
	import Image from '$lib/Image.svelte';
	import { client } from '$lib/client';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import CreateOrder from './CreateOrder.svelte';
	import InventoryChart from './InventoryChart.svelte';
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
		<div class="flex min-w-0 flex-1 items-start gap-3">
			{#if onSelect}
				<label class="mt-7 grid shrink-0 place-content-center rounded" title="Select item">
					<input
						type="checkbox"
						class="checkbox border-2 border-surface-500 bg-white dark:border-surface-100 dark:bg-surface-900 dark:checked:border-primary-400 dark:checked:bg-primary-500"
						checked={selected}
						onchange={(event) => onSelect?.(event.currentTarget.checked)}
					/>
					<span class="sr-only">Select {itemName}</span>
				</label>
			{/if}

			<a
				href={resourceHref}
				class="grid h-20 w-20 shrink-0 place-content-center overflow-hidden rounded-md border border-surface-200 bg-white dark:border-surface-700"
				title="Open item details"
			>
				{#if item.primaryImage}
					<Image
						src={item.primaryImage}
						alt={item.primaryImageDescription ?? `Image of ${itemName}`}
						class="h-20 w-20 object-contain p-1.5"
						thumbnail
					/>
				{:else}
					<span class="px-2 text-center text-xs text-surface-500">No image</span>
				{/if}
			</a>

			<div class="min-w-0 flex-1">
				<a href={resourceHref} class="font-semibold leading-tight hover:underline">{itemName}</a>
				<p class="mt-0.5 break-all text-xs text-surface-500 dark:text-surface-300">
					{item.qbId}{item.upc ? ` · UPC ${item.upc}` : ''}
				</p>
				<p class="mt-1 text-xs text-surface-600 dark:text-surface-300">
					Added {dateAdded} by {item.addedBy}
				</p>
			</div>
		</div>

		<div class="grid grid-cols-4 gap-2 lg:w-[310px] lg:shrink-0">
			<div class="rounded-md bg-primary-100 px-2 py-1.5 text-center dark:bg-primary-900/40">
				<strong class="block text-xl tabular-nums text-primary-800 dark:text-primary-200">
					{item.quantityOnHand ?? '—'}
				</strong>
				<span class="text-[11px] text-primary-800 dark:text-primary-200">On hand</span>
			</div>
			<div class="rounded-md bg-surface-100 px-2 py-1.5 text-center dark:bg-surface-700">
				<strong class="block text-xl tabular-nums">{item.availableQuantity ?? '—'}</strong>
				<span class="text-[11px] text-surface-600 dark:text-surface-300">Available</span>
			</div>
			<div class="rounded-md bg-surface-100 px-2 py-1.5 text-center dark:bg-surface-700">
				<strong class="block text-xl tabular-nums">{item.quantityOnPurchaseOrder ?? '—'}</strong>
				<span class="text-[11px] text-surface-600 dark:text-surface-300">On PO</span>
			</div>
			<div class="rounded-md bg-surface-100 px-2 py-1.5 text-center dark:bg-surface-700">
				<strong class="block text-xl tabular-nums">{item.quantityOnSalesOrder ?? '—'}</strong>
				<span class="text-[11px] text-surface-600 dark:text-surface-300">On SO</span>
			</div>
		</div>

		<InventoryChart history={item.history} current={item.quantityOnHand} />

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
