<script lang="ts">
	import SearchRes from '$lib/search/SearchRes.svelte';
	import type { PageData } from './$types';
	import SearchBar from '$lib/search/SearchBar.svelte';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';
	import { ProgressBar } from '@skeletonlabs/skeleton';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>OEM3 Search "{data.query}"</title>
</svelte:head>

<h1 class="text-center h2 p-2 pt-4">Search</h1>

<SearchBar {...data}></SearchBar>

{#key data.res}
	{#if data.res}
		{#await data.res}
			<div class="w-full p-2">
				<ProgressBar />
			</div>
		{:then res}
			<SearchRes searchPages={[res]} select={undefined} editSearchQuery={undefined} fullHeight />
		{/await}
	{/if}
{/key}

<button
	class="absolute right-2 bottom-12 btn btn-sm variant-filled-secondary"
	onclick={() => {
		const elemPage = document.querySelector('#page');
		if (elemPage !== null) {
			elemPage.scrollTop = 0;
		}
	}}
>
	<span><ChevronUp /></span>
	<span>Scroll to Top</span>
</button>
