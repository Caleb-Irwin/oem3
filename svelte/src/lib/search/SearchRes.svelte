<script lang="ts">
	import Pencil from 'lucide-svelte/icons/pencil';
	import LayoutGrid from 'lucide-svelte/icons/layout-grid';
	import Rows3 from 'lucide-svelte/icons/rows-3';
	import { client } from '../client';
	import { type SelectFunc } from '../ItemRow.svelte';
	import { onMount } from 'svelte';
	import { getModalStore, ProgressBar } from '@skeletonlabs/skeleton';
	import SearchPage from './SearchPage.svelte';
	import type { QueryType } from '../../../../server/src/routers/search';

	interface Props {
		searchPages: Awaited<ReturnType<typeof client.search.search.query>>[];
		select: SelectFunc;
		editSearchQuery?: ((q: { query: string; queryType: QueryType }) => void) | undefined;
		fullHeight?: boolean;
		overrideGrid?: boolean;
	}

	let {
		searchPages = $bindable(),
		select,
		editSearchQuery = undefined,
		fullHeight = false,
		overrideGrid = false
	}: Props = $props();

	let grid = $state(false),
		count = $state(searchPages[searchPages.length - 1].count),
		more = $state(searchPages[searchPages.length - 1].more);

	onMount(() => {
		if (!overrideGrid && localStorage.getItem('grid')) {
			grid = localStorage.getItem('grid') === 'true';
		}
	});
	const modalStore = getModalStore(),
		edit = () => {
			if (editSearchQuery) {
				editSearchQuery({ query: searchPages[0].query, queryType: searchPages[0].queryType });
				return;
			}
			//@ts-expect-error
			$modalStore[0].response({ query: res.query, queryType: res.queryType });
			modalStore.close();
		};

	let lastPage = searchPages[searchPages.length - 1].page;
	async function addPage(pageToAdd: number) {
		if (more && !searchPages[pageToAdd]) {
			const newPage = await client.search.search.query({
				query: searchPages[0].query,
				type: searchPages[0].queryType,
				page: pageToAdd
			});
			lastPage++;
			searchPages[pageToAdd] = newPage;
			searchPages = searchPages;
			count = newPage.count;
			more = newPage.more;
		}
	}
</script>

<div class="card p-2 gap-2 {fullHeight ? '' : ' min-w-80 max-h-[90vh] overflow-scroll'}">
	<h1 class="p-4 pb-2 text-3xl flex items-center">
		<span>
			{`Search Results For "${searchPages[0].query}"`}
			{#if editSearchQuery}
				<button onclick={edit} class="hover:text-primary-500"><Pencil /></button>
			{/if}
			<span class="text-primary-500">{count}{more ? '+' : ''} Result{count === 1 ? '' : 's'}</span>
		</span>

		<span class="flex-grow min-w-4"></span>
		<div class="flex flex-col sm:flex-row rounded-full p-1 variant-outline-primary border-[1px]">
			<button
				class="btn btn-icon btn-icon-lg w-8 h-8 {grid ? 'variant-filled-primary' : ''}"
				onclick={() => {
					grid = true;
					localStorage.setItem('grid', 'true');
				}}><LayoutGrid /></button
			>
			<button
				class="btn btn-icon btn-icon-lg w-8 h-8 {grid ? '' : 'variant-filled-primary'}"
				onclick={() => {
					grid = false;
					localStorage.setItem('grid', 'false');
				}}><Rows3 /></button
			>
		</div>
	</h1>
	{#each searchPages as page (page.page)}
		<SearchPage res={page} {grid} {addPage} {select} all={searchPages[0].queryType === 'all'} />
	{/each}
	{#if more}
		<div class="w-full h-4 p-4">
			<ProgressBar height="h-4" />
		</div>
	{/if}
</div>
