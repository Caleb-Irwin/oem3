<script lang="ts">
	import { ProgressBar, getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import Boxes from 'lucide-svelte/icons/boxes';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ClipboardList from 'lucide-svelte/icons/clipboard-list';
	import PackagePlus from 'lucide-svelte/icons/package-plus';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import { client, handleTRPCError, subVal } from '$lib/client';
	import OldSearch from '$lib/search/OldSearch.svelte';
	import SearchField from '$lib/search/SearchField.svelte';
	import CreateOrder from './CreateOrder.svelte';
	import OrderPlannerItem from './OrderPlannerItem.svelte';
	import OrderView from './OrderView.svelte';
	import type { OrderPlannerItemData, OrderPlannerOrder } from './types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const planner = subVal(client.orderPlanner.getSub, { init: data.orderPlanner });
	const toastStore = getToastStore();
	const modalStore = getModalStore();

	let view: 'list' | 'orders' = $state('list');
	let filter = $state('');
	let orderFilter: 'all' | 'unassigned' = $state('unassigned');
	let selectedItemIds: number[] = $state([]);
	let duplicateWarning: { qbRow: number; locations: string[] } | null = $state(null);
	const canEdit = $derived(
		data.user.permissionLevel === 'general' || data.user.permissionLevel === 'admin'
	);
	const activeItems = $derived(
		($planner?.items ?? []).filter((item) => item.orderStatus !== 'completed')
	);
	const openOrderCount = $derived(
		($planner?.orders ?? []).filter((order) => order.status === 'draft').length
	);
	const tabs = $derived([
		{ id: 'list' as const, label: 'Items', icon: Boxes, count: activeItems.length, unit: 'active' },
		{
			id: 'orders' as const,
			label: 'Orders',
			icon: ClipboardList,
			count: openOrderCount,
			unit: 'open'
		}
	]);

	/** Plain-language names for whatever is currently narrowing the list, for the empty state. */
	const activeFilterLabels = $derived(
		[
			orderFilter === 'unassigned' ? 'not in an order' : null,
			filter.trim() ? `matching “${filter.trim()}”` : null
		].filter((label) => label !== null)
	);
	const filteredItems = $derived.by(() => {
		const query = filter.trim().toLowerCase();
		return activeItems.filter((item) => {
			if (orderFilter === 'unassigned' && item.orderId !== null) return false;
			if (!query) return true;
			return [item.description, item.productName, item.qbId, item.upc, item.vendor, item.orderName]
				.filter(Boolean)
				.some((value) => value!.toLowerCase().includes(query));
		});
	});

	function ordersForItem(item: OrderPlannerItemData) {
		if (!$planner) return [];
		const orderIds = new Set(
			$planner.items
				.filter((candidate) => candidate.qbRow === item.qbRow && candidate.orderId !== null)
				.map((candidate) => candidate.orderId)
		);
		return $planner.orders.filter(
			(order) => order.status !== 'completed' && orderIds.has(order.id) && order.id !== item.orderId
		);
	}

	function groups(items: OrderPlannerItemData[]) {
		const grouped = new Map<string, OrderPlannerItemData[]>();
		for (const item of items) {
			const vendor = item.vendor || 'No preferred vendor';
			grouped.set(vendor, [...(grouped.get(vendor) ?? []), item]);
		}
		return [...grouped.entries()]
			.map(([vendor, vendorItems]) => ({ vendor, items: vendorItems }))
			.sort((a, b) => a.vendor.localeCompare(b.vendor));
	}

	function clearFilters() {
		filter = '';
		orderFilter = 'all';
	}

	function toggleItem(id: number, selected: boolean) {
		selectedItemIds = selected
			? [...new Set([...selectedItemIds, id])]
			: selectedItemIds.filter((itemId) => itemId !== id);
	}

	async function assign(itemIds: number[], orderId: number | null) {
		try {
			await client.orderPlanner.assign.mutate({ itemIds, orderId });
			toastStore.trigger({
				message: orderId === null ? 'Items returned to the main list' : 'Order updated',
				background: 'variant-filled-success'
			});
		} catch (error) {
			handleTRPCError(error);
		}
	}

	async function flagItem(selection: { uniref: number }) {
		try {
			const resource = await client.resources.get.query({ uniId: selection.uniref });
			if (!resource?.qbData) throw new Error('This result is not linked to a QuickBooks item');
			const qbRow = resource.qbData.id;

			const existingItems = ($planner?.items ?? []).filter(
				(item) => item.qbRow === qbRow && item.orderStatus !== 'completed'
			);
			if (existingItems.length === 0) {
				await addToPlanner(qbRow, false);
				return;
			}

			const orderIds = new Set(
				existingItems.filter((item) => item.orderId !== null).map((item) => item.orderId)
			);
			duplicateWarning = {
				qbRow,
				locations: [
					existingItems.some((item) => item.orderId === null) ? 'the list, not in an order' : null,
					...($planner?.orders ?? [])
						.filter((order) => orderIds.has(order.id))
						.map((order) => `${order.name} (${statusLabel(order.status)})`)
				].filter((location) => location !== null)
			};
		} catch (error) {
			handleTRPCError(error);
			throw error;
		}
	}

	function statusLabel(status: OrderPlannerOrder['status']) {
		return status === 'draft' ? 'Open' : status === 'sent' ? 'Sent' : 'Completed';
	}

	async function addToPlanner(qbRow: number, allowDuplicate: boolean) {
		try {
			await client.orderPlanner.flag.mutate({ qbRow, allowDuplicate });
			toastStore.trigger({
				message: allowDuplicate
					? 'Added to the order planner again'
					: 'Item added to the order planner',
				background: 'variant-filled-success'
			});
		} catch (error) {
			handleTRPCError(error);
		}
	}

	function createOrderForItems(itemIds: number[]) {
		modalStore.trigger({
			type: 'component',
			component: {
				ref: CreateOrder,
				props: {
					res: async (order: OrderPlannerOrder) => {
						await assign(itemIds, order.id);
						selectedItemIds = [];
					}
				}
			}
		});
	}
</script>

<svelte:head>
	<title>OEM3 Order Planner</title>
</svelte:head>

<!--
	Quick Add can be reached from on top of the search results, and Skeleton's modal queue throws
	when it is changed while one of its own modals is open, so this warning owns its own layer.
-->
{#if duplicateWarning}
	{@const warning = duplicateWarning}
	<div
		class="fixed inset-0 z-[1001] grid place-items-center bg-surface-backdrop-token p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="duplicate-warning-title"
	>
		<div class="card w-full max-w-md p-5 shadow-xl">
			<h2 id="duplicate-warning-title" class="h3 flex items-center gap-2 font-semibold">
				<TriangleAlert class="text-warning-500" size={22} />
				Already on the planner
			</h2>
			<p class="mt-2 text-surface-700 dark:text-surface-200">
				This item is already in {warning.locations.join(' and ')}.
			</p>
			<p class="mt-2 text-sm text-surface-600 dark:text-surface-300">
				Adding it again gives you a second copy to put in another order.
			</p>
			<div class="mt-5 flex justify-end gap-2">
				<button class="btn variant-ghost-surface" onclick={() => (duplicateWarning = null)}>
					Cancel
				</button>
				<button
					class="btn variant-filled-warning"
					onclick={() => {
						const { qbRow } = warning;
						duplicateWarning = null;
						addToPlanner(qbRow, true);
					}}
				>
					Add anyway
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="order-planner-route mx-auto w-full max-w-[1500px] p-4 sm:p-6">
	<div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="h3">Order Planner</h1>
			<p class="mt-1 text-sm text-surface-600 dark:text-surface-300">
				Flag low-stock items and group them into supplier orders.
			</p>
		</div>

		<div
			class="inline-flex self-start rounded-lg bg-surface-200 p-1 dark:bg-surface-700 sm:self-auto"
			role="tablist"
		>
			{#each tabs as tab (tab.id)}
				{@const active = view === tab.id}
				<button
					class="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors {active
						? 'bg-surface-50 shadow-sm dark:bg-surface-800'
						: 'text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-surface-50'}"
					role="tab"
					aria-selected={active}
					onclick={() => (view = tab.id)}
				>
					<tab.icon size={16} />
					{tab.label}
					{#if $planner}
						<span
							class="rounded-full px-1.5 py-0.5 text-xs tabular-nums {active
								? 'bg-surface-200 dark:bg-surface-700'
								: 'bg-surface-300/70 dark:bg-surface-800'}"
						>
							{tab.count}<span class="sr-only"> {tab.unit}</span>
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	{#if $planner === undefined}
		<div class="mx-auto w-full max-w-lg py-4">
			<ProgressBar meter="bg-primary-500" track="bg-primary-100 dark:bg-primary-900" />
		</div>
	{:else if view === 'orders'}
		<OrderView data={$planner} {canEdit} onAssign={assign} />
	{:else}
		{#if canEdit}
			<section class="card mb-4 p-4">
				<h2 class="mb-3 flex items-center gap-2 font-semibold">
					<PackagePlus size={18} class="text-primary-600 dark:text-primary-400" />
					Add an item to the planner
					<span class="font-normal text-surface-500 dark:text-surface-300">
						— search QuickBooks to flag a low-stock item
					</span>
				</h2>
				<OldSearch
					quickAdd
					quickAddQueryType="qb"
					select={flagItem}
					size="lg"
					class="w-full min-w-0"
				/>
			</section>
		{/if}

		<div class="mb-4">
			<SearchField
				size="lg"
				queryType="qb"
				queryTypes={['qb']}
				placeholder="Filter this list"
				ariaLabel="Filter order planner"
				showSubmitButton={false}
				bind:query={filter}
			>
				{#snippet trailing(place)}
					<label class="relative flex items-stretch {place === 'pill' ? 'h-full' : 'h-10'}">
						<span class="sr-only">Filter items by order</span>
						<select
							bind:value={orderFilter}
							class={place === 'pill'
								? 'h-full cursor-pointer appearance-none truncate border-0 bg-transparent bg-none py-0 pl-3 pr-7 text-sm font-medium outline-none focus:!outline-none focus:ring-0'
								: 'select h-full w-full cursor-pointer appearance-none bg-none py-0 pl-3 pr-9 text-sm font-medium'}
						>
							<option value="all">All active items</option>
							<option value="unassigned">Not in an order</option>
						</select>
						<ChevronDown
							size={16}
							class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-300 {place ===
							'pill'
								? 'right-1.5'
								: 'right-3'}"
						/>
					</label>
				{/snippet}
			</SearchField>
		</div>

		{#if selectedItemIds.length > 0 && canEdit}
			<div
				class="sticky top-2 z-20 mb-3 flex flex-col gap-2 rounded-lg bg-primary-700 p-3 text-white shadow-lg sm:flex-row sm:items-center"
			>
				<span class="min-w-fit font-medium">{selectedItemIds.length} selected</span>
				<label class="min-w-0 flex-1">
					<span class="sr-only">Move selected items to an order</span>
					<select
						class="select w-full text-surface-900"
						value=""
						onchange={async (event) => {
							if (!event.currentTarget.value) return;
							if (event.currentTarget.value === 'create') {
								event.currentTarget.value = '';
								createOrderForItems(selectedItemIds);
								return;
							}
							await assign(selectedItemIds, Number(event.currentTarget.value));
							selectedItemIds = [];
							event.currentTarget.value = '';
						}}
					>
						<option value="">Move to an order…</option>
						<option value="create">+ Create a new order…</option>
						{#each $planner.orders.filter((order) => order.status !== 'completed') as order (order.id)}
							<option value={order.id}>{order.name}</option>
						{/each}
					</select>
				</label>
				<button
					class="btn bg-white text-primary-800 hover:bg-primary-50"
					onclick={async () => {
						await assign(selectedItemIds, null);
						selectedItemIds = [];
					}}
				>
					Remove from order
				</button>
				<button class="btn text-white hover:bg-primary-800" onclick={() => (selectedItemIds = [])}>
					Clear selection
				</button>
			</div>
		{/if}

		<div class="space-y-5">
			{#each groups(filteredItems) as group (group.vendor)}
				<section>
					<div class="mb-2 flex items-center gap-2">
						<h2 class="h4 font-semibold">{group.vendor}</h2>
						<span
							class="rounded-full bg-surface-200 px-2 py-0.5 text-xs tabular-nums dark:bg-surface-700"
						>
							{group.items.length}
						</span>
						{#if canEdit}
							<button
								class="ml-auto rounded-md px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/30"
								aria-pressed={group.items.every((item) => selectedItemIds.includes(item.id))}
								onclick={() => {
									const ids = group.items.map((item) => item.id);
									const allSelected = ids.every((id) => selectedItemIds.includes(id));
									selectedItemIds = allSelected
										? selectedItemIds.filter((id) => !ids.includes(id))
										: [...new Set([...selectedItemIds, ...ids])];
								}}
							>
								{group.items.every((item) => selectedItemIds.includes(item.id))
									? 'Clear supplier'
									: 'Select supplier'}
							</button>
						{/if}
					</div>
					<div class="space-y-2">
						{#each group.items as item (item.id)}
							<OrderPlannerItem
								{item}
								orders={$planner.orders}
								{canEdit}
								onAssign={assign}
								selected={selectedItemIds.includes(item.id)}
								onSelect={canEdit ? (selected) => toggleItem(item.id, selected) : undefined}
								duplicateOrders={ordersForItem(item)}
							/>
						{/each}
					</div>
				</section>
			{:else}
				<div class="card p-10 text-center">
					{#if activeItems.length > 0}
						<h2 class="h3 font-semibold">No matching items</h2>
						<p class="mt-1 text-surface-600 dark:text-surface-300">
							All {activeItems.length}
							{activeItems.length === 1 ? 'item' : 'items'} on the planner are hidden by your current
							filters ({activeFilterLabels.join(', ')}).
						</p>
						<button class="btn variant-soft-primary mt-4" onclick={clearFilters}>
							Clear filters
						</button>
					{:else}
						<h2 class="h3 font-semibold">No low-stock items</h2>
						<p class="mt-1 text-surface-600 dark:text-surface-300">
							{canEdit
								? 'Use the QuickBooks search above when an employee spots low stock.'
								: 'Employees have not flagged any items.'}
						</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
