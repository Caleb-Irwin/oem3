<script lang="ts">
	import { client, query } from '$lib/client';
	import { ProgressBar } from '@skeletonlabs/skeleton';
	import type { PageData } from './$types';
	import type { history as historyType } from '../../../../../../server/src/db.schema';
	import History from '$lib/History.svelte';

	export let data: PageData;

	const res = query(client.resources.get, { uniId: parseInt(data.uniId), includeHistory: true });
	let history: (typeof historyType.$inferSelect)[];
	$: history = $res ? ($res as any)['history'] : undefined;
</script>

{#if $res === undefined}
	<div class="px-4">
		<ProgressBar />
	</div>
{:else if $res === null}
	<p class="text-center text-xl">Resource not found</p>
{:else}
	<h1>Resource</h1>
	<p class="whitespace-pre-wrap">{JSON.stringify($res, undefined, 2)}</p>
	<div class="p-2">
		{#if history}
			<History {history} />
		{/if}
	</div>
{/if}
