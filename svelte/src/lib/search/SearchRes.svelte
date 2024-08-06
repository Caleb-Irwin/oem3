<script lang="ts">
	import Pencil from 'lucide-svelte/icons/pencil';
	import LayoutGrid from 'lucide-svelte/icons/layout-grid';
	import Rows3 from 'lucide-svelte/icons/rows-3';
	import { client } from '../client';
	import { type SelectFunc } from '../ItemRow.svelte';
	import { onMount } from 'svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import SearchPage from './SearchPage.svelte';

	export let res: Awaited<ReturnType<typeof client.search.search.query>>;
	export let select: SelectFunc;

	let grid = false,
		count = res.count,
		more = res.more;

	onMount(() => {
		if (localStorage.getItem('grid')) {
			grid = localStorage.getItem('grid') === 'true';
		}
	});
	const modalStore = getModalStore(),
		edit = () => {
			//@ts-expect-error
			$modalStore[0].response({ query: res.query, queryType: res.queryType });
			modalStore.close();
		};
</script>

<div class=" card p-2 gap-2 min-w-80">
	<h1 class="p-4 pb-2 text-3xl flex items-center">
		<span>
			{`Search Results For "${res.query}"`}

			<button on:click={edit} class="hover:text-primary-500"><Pencil /></button>
			<span class="text-primary-500">{count}{more ? '+' : ''} Result{count === 1 ? '' : 's'}</span>
		</span>
		<span class="flex-grow min-w-4" />
		<div class="flex flex-col sm:flex-row rounded-full p-1 variant-outline-primary border-[1px]">
			<button
				class="btn btn-icon btn-icon-lg w-8 h-8 {grid ? 'variant-filled-primary' : ''}"
				on:click={() => {
					grid = true;
					localStorage.setItem('grid', 'true');
				}}><LayoutGrid /></button
			>
			<button
				class="btn btn-icon btn-icon-lg w-8 h-8 {grid ? '' : 'variant-filled-primary'}"
				on:click={() => {
					grid = false;
					localStorage.setItem('grid', 'false');
				}}><Rows3 /></button
			>
		</div>
	</h1>
	<SearchPage
		{res}
		{grid}
		{select}
		all={res.queryType === 'all'}
		increaseTotal={(newCount, isMore) => {
			count = newCount;
			more = isMore;
		}}
	/>
</div>
