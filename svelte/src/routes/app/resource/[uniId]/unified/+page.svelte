<script lang="ts">
	import { client, sub } from '$lib/client';
	import History from '$lib/History.svelte';
	import type { PageProps } from './$types';
	import GuildItem from './GuildItem.svelte';

	let props: PageProps = $props();

	const _data = sub(client.unified.get, client.unified.onUpdate, {
		init: props.data,
		queryInput: { uniId: props.data.uniId }
	});

	const data = $derived($_data) as typeof props.data;
</script>

{#if data.type === 'unifiedGuild'}
	<GuildItem row={data} />
{/if}

<div class="p-2 lg:p-4 pt-0 lg:pt-0">
	{#if data.history}
		<History history={data.history} />
	{/if}
</div>
