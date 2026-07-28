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

<div class="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 pb-6 pt-8">
	<h1 class="h2">Search</h1>
	<SearchBar {...data}></SearchBar>
</div>

{#key data.res}
	{#if data.res}
		<div class="px-4 pb-6">
			{#await data.res}
				<ProgressBar />
			{:then res}
				<SearchRes searchPages={[res]} select={undefined} editSearchQuery={undefined} fullHeight />
			{/await}
		</div>
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
