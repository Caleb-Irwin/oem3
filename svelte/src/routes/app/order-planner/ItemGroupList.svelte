<script lang="ts">
	import type { Snippet } from 'svelte';
	import OrderPlannerItem from './OrderPlannerItem.svelte';
	import { groupByVendor, type AssignItems } from './planner';
	import type { OrderPlannerItemData, OrderPlannerOrder } from './types';

	interface Selection {
		ids: number[];
		onToggle: (id: number, selected: boolean) => void;
		onToggleGroup: (items: OrderPlannerItemData[]) => void;
	}

	interface Props {
		items: OrderPlannerItemData[];
		orders: OrderPlannerOrder[];
		canEdit: boolean;
		onAssign: AssignItems;
		/** Other open orders holding the same product, warned about on each row. */
		duplicateOrdersFor: (item: OrderPlannerItemData) => OrderPlannerOrder[];
		/** Omit for a read-only list, with no checkboxes, counts, or per-supplier toggle. */
		selection?: Selection;
		showRemove?: boolean;
		/** `page` heads the standalone items list; `nested` sits inside the order detail column. */
		variant?: 'page' | 'nested';
		empty: Snippet;
	}

	let {
		items,
		orders,
		canEdit,
		onAssign,
		duplicateOrdersFor,
		selection,
		showRemove = true,
		variant = 'page',
		empty
	}: Props = $props();
</script>

<div class={variant === 'page' ? 'space-y-5' : 'space-y-4'}>
	{#each groupByVendor(items) as group (group.vendor)}
		{@const groupSelected =
			selection !== undefined && group.items.every((item) => selection.ids.includes(item.id))}
		<section>
			<div class="flex items-center gap-2 {variant === 'page' ? 'mb-2' : 'mb-1.5'}">
				{#if variant === 'page'}
					<h2 class="h4 font-semibold">{group.vendor}</h2>
				{:else}
					<h4 class="font-semibold">{group.vendor}</h4>
				{/if}
				{#if selection}
					<span
						class="rounded-full bg-surface-200 px-2 py-0.5 text-xs tabular-nums dark:bg-surface-700"
					>
						{group.items.length}
					</span>
					{#if canEdit}
						<button
							class="ml-auto rounded-md px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/30"
							aria-pressed={groupSelected}
							onclick={() => selection.onToggleGroup(group.items)}
						>
							{groupSelected ? 'Clear supplier' : 'Select supplier'}
						</button>
					{/if}
				{/if}
			</div>
			<div class="space-y-2">
				{#each group.items as item (item.id)}
					<OrderPlannerItem
						{item}
						{orders}
						{canEdit}
						{onAssign}
						{showRemove}
						selected={selection?.ids.includes(item.id) ?? false}
						onSelect={selection && canEdit
							? (selected) => selection.onToggle(item.id, selected)
							: undefined}
						duplicateOrders={duplicateOrdersFor(item)}
					/>
				{/each}
			</div>
		</section>
	{:else}
		{@render empty()}
	{/each}
</div>
