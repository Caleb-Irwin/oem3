<script lang="ts">
	import { client, subVal } from '$lib/client';
	import History from '$lib/History.svelte';
	import { setContext } from 'svelte';
	import type { LayoutProps } from './$types';
	import GuildItem from './GuildItem.svelte';
	import { toStore } from 'svelte/store';
	import SprItem from './SprItem.svelte';

	let props: LayoutProps = $props();

	const _data = $derived(
		subVal(client.unified.getSub, {
			init: props.data.unifiedRes,
			input: { uniId: props.data.uniId },
			updateTopic: props.data.uniId.toString()
		})
	);

	const data = $derived($_data) as typeof props.data.unifiedRes;

	const unifiedDataStore = toStore(() => data);

	setContext('unifiedData', unifiedDataStore);
</script>

{@render props.children?.()}

{#if data.type === 'unifiedGuild'}
	<GuildItem row={data as any} />
{:else if data.type === 'unifiedSpr'}
	<SprItem row={data as any} />
{:else}
	<p class="p-2">Unknown unified type: {data.type}</p>
{/if}

<div class="p-2 pt-0 lg:pt-0">
	{#if data.history}
		<History history={data.history} />
	{/if}
</div>
