<script lang="ts">
	import { getModalStore, ProgressBar } from '@skeletonlabs/skeleton';
	import Plus from 'lucide-svelte/icons/plus';
	import Search from 'lucide-svelte/icons/search';
	import { client, subVal } from '$lib/client';
	import CompactSearch from '$lib/search/CompactSearch.svelte';
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
			<p class="text-surface-500">Custom pricing overrides for unified products</p>
		</div>

		<div class="flex flex-col md:flex-row gap-2 pb-4">
			<label class="input-group grid-cols-[auto_1fr] flex-grow">
				<div class="input-group-shim"><Search size={20} /></div>
				<input
					type="search"
					placeholder="Filter this price list"
					aria-label="Filter this price list"
					bind:value={filter}
				/>
			</label>
			<div class="md:w-[28rem]">
				<OldSearch
					quickAdd
					quickAddQueryType="unifiedProduct"
					select={addProduct}
				/>
			</div>
			<button
				class="btn variant-ghost-primary text-primary-500 h-14 md:w-auto"
				onclick={() =>
					modalStore.trigger({
						type: 'component',
						component: {
							ref: CompactSearch,
							props: {
								queryType: 'unifiedProduct',
								select: addProduct
							}
						}
					})}
			>
				<Plus />
				<span>Add Price</span>
			</button>
		</div>

		{#if $priceList === undefined}
			<div class="w-full max-w-lg mx-auto py-2">
				<ProgressBar />
			</div>
		{:else}
			<div class="flex justify-between items-center px-1 pb-2">
				<p class="text-sm text-surface-500">
					{filteredPrices.length} of {$priceList.length}
					{filter.trim() ? ' matching' : ''} custom {filteredPrices.length === 1 ? 'price' : 'prices'}
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
						<p class="text-surface-500 pt-1">
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
