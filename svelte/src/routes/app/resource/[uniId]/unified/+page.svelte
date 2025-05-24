<script lang="ts">
	import History from '$lib/History.svelte';
	import type { PageProps } from './$types';
	import GuildItem from './GuildItem.svelte';

	let { data }: PageProps = $props();
</script>

{#if data.type === 'unifiedGuild'}
	<GuildItem row={data} />
{/if}

<div class="p-2 lg:p-4 pt-0 lg:pt-0">
	{#if data.history}
		<History history={data.history} />
	{/if}
</div>
