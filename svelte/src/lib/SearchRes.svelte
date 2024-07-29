<script lang="ts">
	import Pencil from 'lucide-svelte/icons/pencil';
	import LayoutGrid from 'lucide-svelte/icons/layout-grid';
	import Rows3 from 'lucide-svelte/icons/rows-3';
	import { client } from './client';
	import ItemRow, { type SelectFunc } from './ItemRow.svelte';
	import { onMount } from 'svelte';
	import { getModalStore } from '@skeletonlabs/skeleton';

	export let res: Awaited<ReturnType<typeof client.search.search.query>>;
	export let select: SelectFunc;

	let grid = false;

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
			<span class="text-primary-500"
				>{res.count}{res.more ? '+' : ''} Result{res.count === 1 ? '' : 's'}</span
			>
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
	<div
		class="grid gap-2 {grid
			? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 '
			: 'grid-cols-1'}
    "
	>
		{#each res.results as { uniref }}
			<ItemRow
				rawProduct={uniref}
				{grid}
				select={async (selection) => {
					select ? await select(selection) : undefined;
					modalStore.close();
				}}
			/>
		{/each}
		{#if res.more}
			<p class="pt-2 text-center">More results available - TODO</p>
		{/if}
	</div>
</div>
