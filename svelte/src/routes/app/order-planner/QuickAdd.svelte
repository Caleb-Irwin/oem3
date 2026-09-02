<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import { client, handleTRPCError } from '$lib/client';
	import OldSearch from '$lib/search/OldSearch.svelte';
	import { statusLabel } from './planner';
	import type { OrderPlannerData } from './types';

	interface Props {
		data: OrderPlannerData;
		/** Adds straight into this order rather than the unassigned list. */
		orderId?: number | null;
		size?: 'sm' | 'lg';
		placeholder?: string;
	}

	let { data, orderId = null, size = 'sm', placeholder }: Props = $props();
	let duplicateWarning: { qbRow: number; locations: string[] } | null = $state(null);
	const toastStore = getToastStore();

	async function search(selection: { uniref: number }) {
		try {
			const resource = await client.resources.get.query({ uniId: selection.uniref });
			if (!resource?.qbData) throw new Error('This result is not linked to a QuickBooks item');
			const qbRow = resource.qbData.id;

			// A row left behind in a completed order is a finished purchase, not a place
			// the item still sits, so it never counts as a duplicate. Matches the server.
			const existing = data.items.filter(
				(item) => item.qbRow === qbRow && item.orderStatus !== 'completed'
			);
			if (existing.length === 0) {
				await add(qbRow, false);
				return;
			}

			const orderIds = new Set(
				existing.filter((item) => item.orderId !== null).map((item) => item.orderId)
			);
			duplicateWarning = {
				qbRow,
				locations: [
					existing.some((item) => item.orderId === null) ? 'the list, not in an order' : null,
					...data.orders
						.filter((order) => orderIds.has(order.id))
						.map((order) => `${order.name} (${statusLabel(order.status)})`)
				].filter((location) => location !== null)
			};
		} catch (error) {
			handleTRPCError(error);
			throw error;
		}
	}

	async function add(qbRow: number, allowDuplicate: boolean) {
		try {
			await client.orderPlanner.flag.mutate({ qbRow, allowDuplicate, orderId });
			toastStore.trigger({
				message: orderId === null ? 'Item added to the order planner' : 'Item added to this order',
				background: 'variant-filled-success'
			});
		} catch (error) {
			handleTRPCError(error);
		}
	}
</script>

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
				{orderId === null
					? 'Adding it again gives you a second copy to put in another order.'
					: 'Adding it again puts a second copy in this order.'}
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
						add(qbRow, true);
					}}
				>
					Add anyway
				</button>
			</div>
		</div>
	</div>
{/if}

<OldSearch
	quickAdd
	quickAddQueryType="qb"
	select={search}
	{size}
	{placeholder}
	class="w-full min-w-0"
/>
