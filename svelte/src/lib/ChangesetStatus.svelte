<script lang="ts">
	import WorkerStatus from '$lib/WorkerStatus.svelte';
	import type { Readable } from 'svelte/store';
	import HistoryIcon from 'lucide-svelte/icons/history';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import Suspense from './Suspense.svelte';
	import { client } from './client';
	import History from './History.svelte';
	import type { changesets } from '../../../server/src/db.schema';

	export let status: Readable<
			| {
					message: string;
					error: boolean;
					running: boolean;
					progress: number;
			  }
			| undefined
		>,
		changeset: Readable<typeof changesets.$inferSelect | null | undefined>,
		name: string;

	let summary: { [type: string]: number };
	$: summary = JSON.parse($changeset?.summary ?? '{}');

	const modalStore = getModalStore();
</script>

<div class="card p-4 min-w-72">
	<div class="flex justify-between pb-2 items-center">
		<h4 class="pr-2 h4 font-semibold">{name} Changeset {$changeset ? '#' + $changeset?.id : ''}</h4>
		<button
			class="btn btn-icon btn-icon-sm"
			disabled={!$changeset}
			on:click={() =>
				modalStore.trigger({
					type: 'component',
					component: {
						ref: Suspense,
						props: {
							component: History,
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
			Created at {new Date($changeset.created ?? 0).toLocaleString()} based on file #{$changeset.file}
		</p>
		{#if $changeset?.status === 'generating'}
			<WorkerStatus {status} />
		{/if}
		{#if $changeset.status === 'completed'}
			<h5 class="font-semibold text-lg">Changes</h5>
			<ul class="p-2 flex w-full justify-between">
				<li class="text-center">
					<span class="font-semibold">None</span> <br />
					{summary['nop'] ?? 0}
				</li>
				<li class="text-center">
					<span class="font-semibold">Inventory</span> <br />
					{summary['inventoryUpdate'] ?? 0}
				</li>
				<li class="text-center">
					<span class="font-semibold">Update</span> <br />
					{summary['update'] ?? 0}
				</li>
				<li class="text-center">
					<span class="font-semibold">Create</span> <br />
					{summary['create'] ?? 0}
				</li>
				<li class="text-center">
					<span class="font-semibold">Delete</span> <br />
					{summary['delete'] ?? 0}
				</li>
			</ul>
		{/if}
	{:else}
		<p class="pt-2">Apply a file to create a changeset</p>
	{/if}
</div>
