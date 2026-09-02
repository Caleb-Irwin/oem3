<script lang="ts">
	import ClipboardPenLine from 'lucide-svelte/icons/clipboard-pen-line';
	import History from 'lucide-svelte/icons/history';
	import type { CompletedOrder, OrderPlannerData } from './types';

	interface Props {
		data: OrderPlannerData;
		/** Finished orders paged in on demand; years of them must never all be rendered. */
		completed: CompletedOrder[];
		loadingHistory: boolean;
		pageSize: number;
		selectedOrderId: number | null;
		onSelect: (id: number) => void;
		onLoadMore: () => void;
	}

	let { data, completed, loadingHistory, pageSize, selectedOrderId, onSelect, onLoadMore }: Props =
		$props();

	const currentGroups = $derived(
		(['draft', 'sent'] as const)
			.map((status) => ({
				status,
				label: status === 'draft' ? 'Open' : 'Sent to vendor',
				orders: data.orders.filter((order) => order.status === status)
			}))
			.filter((group) => group.orders.length > 0)
	);
</script>

{#snippet orderButton(id: number, name: string, count: number, selectedClass: string)}
	<button
		class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left {selectedOrderId === id
			? selectedClass
			: 'hover:bg-surface-100 dark:hover:bg-surface-700'}"
		onclick={() => onSelect(id)}
	>
		<span class="min-w-0 flex-1 truncate font-medium">{name}</span>
		<span class="rounded-full bg-surface-200 px-2 py-0.5 text-xs tabular-nums dark:bg-surface-600">
			{count}
		</span>
	</button>
{/snippet}

{#snippet emptyNote(text: string)}
	<p
		class="rounded-md bg-surface-100 px-3 py-4 text-center text-sm text-surface-600 dark:bg-surface-700 dark:text-surface-300"
	>
		{text}
	</p>
{/snippet}

<aside class="card p-3">
	<div class="px-2 pb-3">
		<h2 class="flex items-center gap-2 font-semibold">
			<ClipboardPenLine size={18} />
			Current orders
		</h2>
		<p class="mt-1 text-xs text-surface-600 dark:text-surface-300">
			Orders still being prepared or sent to a vendor.
		</p>
	</div>

	<nav class="space-y-4" aria-label="Current order planner orders">
		{#each currentGroups as group (group.status)}
			<section>
				<h3
					class="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-300"
				>
					{group.label}
				</h3>
				<div class="space-y-1">
					{#each group.orders as order (order.id)}
						{@render orderButton(
							order.id,
							order.name,
							data.items.filter((item) => item.orderId === order.id).length,
							'bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100'
						)}
					{/each}
				</div>
			</section>
		{/each}
		{#if data.orders.length === 0}
			{@render emptyNote('No current orders.')}
		{/if}
	</nav>
</aside>

<aside class="card p-3">
	<div class="px-2 pb-3">
		<h2 class="flex items-center gap-2 font-semibold">
			<History size={18} />
			Order history
		</h2>
		<p class="mt-1 text-xs text-surface-600 dark:text-surface-300">
			Completed orders are kept here for reference.
			{#if data.completedCount > 0}
				Showing {completed.length} of {data.completedCount}.
			{/if}
		</p>
	</div>
	<nav aria-label="Completed order planner orders">
		<div class="space-y-1">
			{#each completed as order (order.id)}
				{@render orderButton(
					order.id,
					order.name,
					order.itemCount,
					'bg-success-100 text-success-900 dark:bg-success-900/40 dark:text-success-100'
				)}
			{:else}
				{@render emptyNote(loadingHistory ? 'Loading…' : 'No completed orders yet.')}
			{/each}
		</div>
		{#if completed.length < data.completedCount}
			<button
				class="mt-2 w-full rounded-md border border-surface-300 px-2 py-2 text-center text-sm font-medium hover:bg-surface-100 disabled:opacity-60 dark:border-surface-600 dark:hover:bg-surface-700"
				disabled={loadingHistory}
				onclick={onLoadMore}
			>
				{loadingHistory
					? 'Loading…'
					: `Load ${Math.min(pageSize, data.completedCount - completed.length)} more`}
			</button>
		{/if}
	</nav>
</aside>
