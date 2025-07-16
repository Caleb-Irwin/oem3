<script lang="ts">
	import WorkerStatus from '$lib/WorkerStatus.svelte';
	import type { Readable } from 'svelte/store';
	import HistoryIcon from 'lucide-svelte/icons/history';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Suspense from './Suspense.svelte';
	import { client } from './client';
	import History from './History.svelte';
	import BarChart from './summary/BarChart.svelte';
	import type { changesets } from '../../../server/src/db.schema';

	interface Props {
		status: Readable<
			| {
					message: string;
					error: boolean;
					running: boolean;
					progress: number;
			  }
			| undefined
		>;
		changeset: Readable<typeof changesets.$inferSelect | null | undefined>;
		name: string;
	}

	let { status, changeset, name }: Props = $props();

	type SummaryType = 'nop' | 'inventoryUpdate' | 'update' | 'create' | 'delete';

	let summary: { [type in SummaryType]: number } = $derived(
		JSON.parse($changeset?.summary ?? '{}')
	);

	function getChangeTypeLabel(type: string): string {
		switch (type) {
			case 'nop':
				return 'None';
			case 'inventoryUpdate':
				return 'Inventory';
			case 'update':
				return 'Update';
			case 'create':
				return 'Create';
			case 'delete':
				return 'Delete';
			default:
				return type;
		}
	}

	let chartValues = $derived([
		summary['nop'] ?? 0,
		summary['inventoryUpdate'] ?? 0,
		summary['update'] ?? 0,
		summary['create'] ?? 0,
		summary['delete'] ?? 0
	]);

	const changesetColors = {
		nop: 'bg-secondary-100',
		inventoryUpdate: 'bg-secondary-300',
		update: 'bg-secondary-500',
		create: 'bg-secondary-700',
		delete: 'bg-error-600'
	};

	const modalStore = getModalStore();
</script>

<div class="card p-4 min-w-72">
	<div class="flex justify-between pb-2 items-center">
		<h4 class="pr-2 h4 font-semibold">{name} Changeset {$changeset ? '#' + $changeset?.id : ''}</h4>
		<button
			class="btn btn-icon btn-icon-sm"
			disabled={!$changeset}
			onclick={() =>
				modalStore.trigger({
					type: 'component',
					component: {
						ref: Suspense,
						props: {
							Comp: History,
							promise: (async () => {
								return {
									history: await client.resources.getChangesets.query({
										type: $changeset?.type ?? 'qb'
									})
								};
							})()
						}
					}
				})}><HistoryIcon /></button
		>
	</div>

	{#if $changeset}
		<p class="text-sm pb-2">
			Created at {new Date($changeset.created ?? 0).toLocaleString()}
			{$changeset.file ? `based on file #${$changeset.file}` : ''}
		</p>
		{#if $changeset?.status === 'generating' || $status?.running}
			<WorkerStatus {status} />
		{/if}
		{#if $changeset.status === 'completed'}
			<h5 class="font-semibold text-lg mb-2">Changes</h5>

			<BarChart
				data={summary}
				variant="secondary"
				labelFormatter={getChangeTypeLabel}
				customColors={changesetColors}
				showZeroCounts={true}
				showTotal={true}
				maxColumns={2}
			/>
		{/if}
	{:else}
		<p class="pt-2">Apply a file to create a changeset</p>
	{/if}
</div>
