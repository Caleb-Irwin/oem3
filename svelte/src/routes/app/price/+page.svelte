<script lang="ts">
	import { getModalStore, ProgressBar } from '@skeletonlabs/skeleton';
	import Search from 'lucide-svelte/icons/search';
	import { client, subVal } from '$lib/client';
	import OldSearch from '$lib/search/OldSearch.svelte';
	import PriceForm from './PriceForm.svelte';
	import PriceRow from './PriceRow.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const priceList = subVal(client.product.priceList.listSub, { init: data.prices });
	const modalStore = getModalStore();
	let filter = $state('');

	const filteredPrices = $derived(
		($priceList ?? []).filter((item) => {
			const query = filter.trim().toLowerCase();
			if (!query) return true;
			return [item.title, item.gid, item.sprc, item.upc]
				.filter(Boolean)
				.some((value) => value!.toLowerCase().includes(query));
		})
	);

	async function openPriceForm(item: (typeof data.prices)[number]) {
		const currentItem = await client.product.priceList.item.query({ uniId: item.uniId });
		modalStore.trigger({
			type: 'component',
			component: { ref: PriceForm, props: { item: currentItem } }
		});
	}

	async function addProduct(selection: { uniref: number }) {
		const item = await client.product.priceList.item.query({ uniId: selection.uniref });
		modalStore.trigger({
			type: 'component',
			component: { ref: PriceForm, props: { item } }
		});
	}
</script>

<svelte:head>
	<title>OEM3 Unified Price List</title>
</svelte:head>

<div class="h-full w-full p-4 flex flex-col items-center">
	<div class="w-full max-w-6xl">
		<div class="text-center pb-3">
			<h1 class="h2">Unified Price List</h1>
			<p class="text-surface-600 dark:text-surface-300">
				Custom pricing overrides for unified products
			</p>
		</div>

		<div class="flex flex-col md:flex-row gap-2 pb-4">
			<label
				class="flex h-14 flex-grow items-center rounded-full border border-surface-300 bg-surface-100 px-5 shadow-sm transition-colors focus-within:border-primary-500 dark:border-surface-400/40 dark:bg-surface-700"
			>
				<Search size={20} class="shrink-0 text-surface-400 dark:text-surface-300" />
				<input
					type="search"
					placeholder="Filter this price list"
					aria-label="Filter this price list"
					class="h-full min-w-0 flex-1 border-0 bg-transparent bg-none px-3 outline-none focus:!outline-none focus:ring-0"
					bind:value={filter}
				/>
			</label>
			<div class="md:w-[28rem]">
				<OldSearch quickAdd quickAddQueryType="unifiedProduct" select={addProduct} />
			</div>
		</div>

		{#if $priceList === undefined}
			<div class="w-full max-w-lg mx-auto py-2">
				<ProgressBar />
			</div>
		{:else}
			<div class="flex justify-between items-center px-1 pb-2">
				<p class="text-sm text-surface-600 dark:text-surface-300">
					{filteredPrices.length} of {$priceList.length}
					{filter.trim() ? ' matching' : ''} custom {filteredPrices.length === 1
						? 'price'
						: 'prices'}
				</p>
			</div>

			<ul class="w-full space-y-2">
				{#each filteredPrices as item, index (item.uniId)}
					<PriceRow {item} {index} edit={openPriceForm} />
				{:else}
					<li class="card p-8 text-center">
						<p class="text-lg font-semibold">
							{filter.trim() ? 'No matching custom prices' : 'No custom prices yet'}
						</p>
						<p class="text-surface-600 dark:text-surface-300 pt-1">
							{filter.trim()
								? 'Try a different title or product number.'
								: 'Search for a unified product above to add one.'}
						</p>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
