<script lang="ts">
	import { client, subVal } from '$lib/client';
	import History from '$lib/History.svelte';
	import { setContext } from 'svelte';
	import type { LayoutProps } from './$types';
	import GuildItem from './GuildItem.svelte';
	import { toStore } from 'svelte/store';

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
	<GuildItem row={data} />
{/if}

<div class="p-2 pt-0 lg:pt-0">
	{#if data.history}
		<History history={data.history} />
	{/if}
</div>
