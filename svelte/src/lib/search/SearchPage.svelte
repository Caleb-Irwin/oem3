<script lang="ts">
	import { client } from '$lib/client';
	import ItemRow, { type SelectFunc } from '$lib/ItemRow.svelte';
	import { getModalStore, ProgressBar } from '@skeletonlabs/skeleton';
	import IntersectionObserver from 'svelte-intersection-observer';

	interface Props {
		res: Awaited<ReturnType<typeof client.search.search.query>>;
		grid: boolean;
		all: boolean;
		select: SelectFunc;
		addPage: (pageToAdd: number) => Promise<void>;
	}

	let { res, grid, all, select, addPage }: Props = $props();
	const modalStore = getModalStore();
	let el: HTMLDivElement | undefined = $state();
</script>

<IntersectionObserver element={el} once on:intersect={() => addPage(res.page + 1)}>
	<div
		class="grid gap-2 {grid
			? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 '
			: 'grid-cols-1'}
    "
		bind:this={el}
	>
		{#each res.results as { uniref }}
			<ItemRow
				rawProduct={uniref}
				{grid}
				{all}
				select={select
					? async (selection) => {
							await select(selection);
							modalStore.close();
						}
					: undefined}
				newTab
			/>
		{/each}
	</div>
</IntersectionObserver>
