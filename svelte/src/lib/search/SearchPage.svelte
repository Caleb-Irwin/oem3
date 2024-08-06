<script lang="ts">
	import { client } from '$lib/client';
	import ItemRow, { type SelectFunc } from '$lib/ItemRow.svelte';
	import { getModalStore, ProgressBar } from '@skeletonlabs/skeleton';
	import IntersectionObserver from 'svelte-intersection-observer';

	export let res: Awaited<ReturnType<typeof client.search.search.query>>,
		grid: boolean,
		all: boolean,
		select: SelectFunc,
		increaseTotal: (newCount: number, isMore: boolean) => void;
	const modalStore = getModalStore();
	let el: HTMLDivElement;

	let moreRes: Awaited<ReturnType<typeof client.search.search.query>> | undefined = undefined;
	const handleIntersect = async () => {
		if (res.more) {
			console.log(res.page, 'getting more');

			moreRes = await client.search.search.query({
				query: res.query,
				type: res.queryType,
				page: res.page + 1
			});
			increaseTotal(moreRes.count, moreRes.more);
		}
	};
</script>

<IntersectionObserver element={el} once on:intersect={handleIntersect}>
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
			/>
		{/each}
	</div>
</IntersectionObserver>
{#if res.more}
	{#if moreRes === undefined}
		<div class="w-full h-4 p-4">
			<ProgressBar height="h-4" />
		</div>
	{:else}
		<svelte:self res={moreRes} {grid} {select} {increaseTotal} />
	{/if}
{/if}
