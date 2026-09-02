<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import SearchField from '$lib/search/SearchField.svelte';
	import CreateOrder from './CreateOrder.svelte';
	import ItemGroupList from './ItemGroupList.svelte';
	import QuickAddPanel from './QuickAddPanel.svelte';
	import { getPlannerContext, matchesQuery, ordersForItem, toggleGroup, toggleId } from './planner';
	import type { OrderPlannerItemData, OrderPlannerOrder } from './types';

	const { data: plannerStore, canEdit, assign } = getPlannerContext();
	const modalStore = getModalStore();

	let filter = $state('');
	let orderFilter: 'all' | 'unassigned' = $state('unassigned');
	let selectedItemIds: number[] = $state([]);

	const planner = $derived($plannerStore);
	const activeItems = $derived(planner.items.filter((item) => item.orderStatus !== 'completed'));
	const filteredItems = $derived.by(() => {
		const query = filter.trim().toLowerCase();
		return activeItems.filter(
			(item) =>
				!(orderFilter === 'unassigned' && item.orderId !== null) && matchesQuery(item, query)
		);
	});
	/** Plain-language names for whatever is currently narrowing the list, for the empty state. */
	const activeFilterLabels = $derived(
		[
			orderFilter === 'unassigned' ? 'not in an order' : null,
			filter.trim() ? `matching “${filter.trim()}”` : null
		].filter((label) => label !== null)
	);

	function clearFilters() {
		filter = '';
		orderFilter = 'all';
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

{#if canEdit}
	<QuickAddPanel data={planner} />
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
				{#each planner.orders.filter((order) => order.status !== 'completed') as order (order.id)}
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

<ItemGroupList
	items={filteredItems}
	orders={planner.orders}
	{canEdit}
	onAssign={assign}
	duplicateOrdersFor={(item: OrderPlannerItemData) => ordersForItem(planner, item, item.orderId)}
	selection={{
		ids: selectedItemIds,
		onToggle: (id, selected) => (selectedItemIds = toggleId(selectedItemIds, id, selected)),
		onToggleGroup: (items) =>
			(selectedItemIds = toggleGroup(
				selectedItemIds,
				items.map((item) => item.id)
			))
	}}
	empty={emptyList}
/>

{#snippet emptyList()}
	<div class="card p-10 text-center">
		{#if activeItems.length > 0}
			<h2 class="h3 font-semibold">No matching items</h2>
			<p class="mt-1 text-surface-600 dark:text-surface-300">
				All {activeItems.length}
				{activeItems.length === 1 ? 'item' : 'items'} on the planner are hidden by your current filters
				({activeFilterLabels.join(', ')}).
			</p>
			<button class="btn variant-soft-primary mt-4" onclick={clearFilters}>Clear filters</button>
		{:else}
			<h2 class="h3 font-semibold">No low-stock items</h2>
			<p class="mt-1 text-surface-600 dark:text-surface-300">
				{canEdit
					? 'Use the QuickBooks search above when an employee spots low stock.'
					: 'Employees have not flagged any items.'}
			</p>
		{/if}
	</div>
{/snippet}
