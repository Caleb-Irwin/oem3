<script lang="ts">
	import WorkerStatus from '$lib/WorkerStatus.svelte';
	import type { Readable } from 'svelte/store';

	export let status: Readable<
			| {
					message: string;
					error: boolean;
					running: boolean;
					progress: number;
			  }
			| undefined
		>,
		changeset: Readable<
			| {
					type: 'qb';
					status:
						| 'error'
						| 'generating'
						| 'current'
						| 'completed'
						| 'cancelled'
						| 'partiallyCancelled';
					id: number;
					file: number | null;
					created: number;
			  }
			| null
			| undefined
		>;

	let workerOpen = $changeset?.status === 'generating' || $changeset?.status === 'error';
	$: {
		if ($changeset?.status === 'generating' || $changeset?.status === 'error') workerOpen = true;
		else workerOpen = false;
	}
</script>

<div class="card p-4">
	<h4 class="pr-2 h4 font-semibold pb-2">Changeset {$changeset ? '#' + $changeset?.id : ''}</h4>
	{#if workerOpen || !$changeset}
		<WorkerStatus {status} />
	{/if}
	{#if $changeset}
		<p class="text-sm">
			Created at {new Date($changeset.created ?? 0).toLocaleString()} based on file #{$changeset.file}
		</p>
		<p>{$changeset?.status}</p>
	{:else}
		<p class="pt-2">Apply a file to create a changeset</p>
	{/if}
</div>
