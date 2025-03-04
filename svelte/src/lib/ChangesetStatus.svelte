<script lang="ts">
	import WorkerStatus from '$lib/WorkerStatus.svelte';
	import type { Readable } from 'svelte/store';
	import HistoryIcon from 'lucide-svelte/icons/history';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Suspense from './Suspense.svelte';
	import { client } from './client';
	import History from './History.svelte';
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

	let chartValues = $derived([
		summary['nop'] ?? 0,
		summary['inventoryUpdate'] ?? 0,
		summary['update'] ?? 0,
		summary['create'] ?? 0,
		summary['delete'] ?? 0
	]);
	let totalChanges = $derived(chartValues.reduce((sum, value) => sum + value, 0));

	const chartColors = {
		nop: 'bg-emerald-100',
		inventoryUpdate: 'bg-emerald-300',
		update: 'bg-emerald-500',
		create: 'bg-emerald-700',
		delete: 'bg-emerald-900'
	};

	const changeTypes: SummaryType[] = ['nop', 'inventoryUpdate', 'update', 'create', 'delete'];

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
		{#if $changeset?.status === 'generating'}
			<WorkerStatus {status} />
		{/if}
		{#if $changeset.status === 'completed'}
			<h5 class="font-semibold text-lg mb-2">Changes</h5>

			<ul class="p-2 flex w-full justify-between">
				<li class="text-center">
					<div class="flex items-center justify-center mb-1">
						<div class="w-3 h-3 mr-1 rounded-sm {chartColors['nop']}"></div>
						<span class="font-semibold pl-1">None</span>
					</div>
					<span>{summary['nop'] ?? 0}</span>
				</li>
				<li class="text-center">
					<div class="flex items-center justify-center mb-1">
						<div class="w-3 h-3 mr-1 rounded-sm {chartColors['inventoryUpdate']}"></div>
						<span class="font-semibold pl-1">Inventory</span>
					</div>
					<span>{summary['inventoryUpdate'] ?? 0}</span>
				</li>
				<li class="text-center">
					<div class="flex items-center justify-center mb-1">
						<div class="w-3 h-3 mr-1 rounded-sm {chartColors['update']}"></div>
						<span class="font-semibold pl-1">Update</span>
					</div>
					<span>{summary['update'] ?? 0}</span>
				</li>
				<li class="text-center">
					<div class="flex items-center justify-center mb-1">
						<div class="w-3 h-3 mr-1 rounded-sm {chartColors['create']}"></div>
						<span class="font-semibold pl-1">Create</span>
					</div>
					<span>{summary['create'] ?? 0}</span>
				</li>
				<li class="text-center">
					<div class="flex items-center justify-center mb-1">
						<div class="w-3 h-3 mr-1 rounded-sm {chartColors['delete']}"></div>
						<span class="font-semibold pl-1">Delete</span>
					</div>
					<span>{summary['delete'] ?? 0}</span>
				</li>
			</ul>

			<!-- Bar Chart Visualization -->
			{#if totalChanges > 0}
				<div class="mt-2">
					<div class="flex w-full h-5 rounded-md overflow-hidden">
						{#each changeTypes as type}
							{#if (summary[type] ?? 0) > 0}
								<div
									class="{chartColors[type]} h-full"
									style="width: {((summary[type] ?? 0) / totalChanges) * 100}%"
									title="{type === 'nop'
										? 'None'
										: type === 'inventoryUpdate'
											? 'Inventory'
											: type === 'update'
												? 'Update'
												: type === 'create'
													? 'Create'
													: 'Delete'}: 
                                         {summary[type]} ({(
										((summary[type] ?? 0) / totalChanges) *
										100
									).toFixed(1)}%)"
								></div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	{:else}
		<p class="pt-2">Apply a file to create a changeset</p>
	{/if}
</div>
