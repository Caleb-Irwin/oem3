<script lang="ts">
	import { client, query } from '$lib/client';
	import { ProgressBar } from '@skeletonlabs/skeleton';
	import type { PageData } from './$types';
	import EnhancedItemRow from './EnhancedItemRow.svelte';
	import { getSmartChangeset } from './smartChangeset';
	import Changes from './Changes.svelte';
	import SmartInput from './SmartInput.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const res = query(client.unifiedItems.item, { id: parseInt(data.id) });
	let alt: boolean = $state(
		!!(
			$res?.defaultAltConversionFactor !== undefined ||
			$res?.altUm !== undefined ||
			$res?.altPriceCents !== undefined ||
			$res?.qbAlt ||
			$res?.shopifyAlt
		)
	);
</script>

{#if $res === undefined}
	<div class="px-4">
		<ProgressBar />
	</div>
{:else if $res === null}
	<p class="text-center text-xl">Resource not found</p>
{:else}
	{#await getSmartChangeset(res)}
		<p>Loading</p>
	{:then smartChangeset}
		<Changes changes={smartChangeset.changes} />
		<div class="p-2">
			<h2 class="h2 p-1 pt-4 text-center">Matching</h2>

			<h3 class="h3 p-1 text-center">Guild</h3>
			<div class="grid gap-2 grid-cols-1 sm:grid-cols-3 px-2">
				<EnhancedItemRow {smartChangeset} key="guild">Guild Data</EnhancedItemRow>
				<EnhancedItemRow {smartChangeset} key="guildInventory">Guild Inventory</EnhancedItemRow>
				<EnhancedItemRow {smartChangeset} key="guildFlyer">Guild Flyer</EnhancedItemRow>
			</div>
			<h3 class="h3 p-1 text-center">SPR</h3>
			<div class="flex place-content-center w-full">
				<div class="w-full grid gap-2 grid-cols-1 sm:grid-cols-2 max-w-[1156px] px-2">
					<EnhancedItemRow {smartChangeset} key="sprPriceFile">SPR Price File</EnhancedItemRow>
					<EnhancedItemRow {smartChangeset} key="sprFlatFile">SPR Flat File</EnhancedItemRow>
				</div>
			</div>

			<h3 class="h3 pt-4 p-1 text-center">Unit of Measure</h3>
			<div class="flex place-content-center w-full">
				<button
					class="btn btn-sm h-8 variant-ghost-secondary text-secondary-500"
					onclick={() => (alt = !alt)}>{alt ? 'Hide' : 'Show'} Alternate UM</button
				>
			</div>
			<div class="flex place-content-center w-full">
				<div class="flex flex-col lg:flex-row p-2 pt-0 gap-2 {alt ? '' : 'max-w-96 items-center'}">
					<SmartInput {smartChangeset} key="defaultUm" example="ea" />
					{#if alt}
						<SmartInput {smartChangeset} key="defaultAltConversionFactor" example="12" />
						<SmartInput {smartChangeset} key="altUm" example="pk" />
					{/if}
				</div>
			</div>

			<h3 class="h3 pt-2 p-1 text-center">QuickBooks</h3>
			<div class="flex place-content-center w-full">
				<div
					class="w-full grid gap-2 grid-cols-1 {alt
						? 'sm:grid-cols-2 max-w-[1156px]'
						: 'max-w-[576px]'} px-2"
				>
					<EnhancedItemRow {smartChangeset} key="qb">QuickBooks</EnhancedItemRow>
					{#if alt}
						<EnhancedItemRow {smartChangeset} key="qbAlt">QuickBooks Alternate</EnhancedItemRow>
					{/if}
				</div>
			</div>

			<h3 class="h3 pt-2 p-1 text-center">Shopify</h3>
			<div class="flex place-content-center w-full">
				<div
					class="w-full grid gap-2 grid-cols-1 {alt
						? 'sm:grid-cols-2 max-w-[1156px]'
						: 'max-w-[576px]'} px-2"
				>
					<EnhancedItemRow {smartChangeset} key="shopify">Shopify</EnhancedItemRow>
					{#if alt}
						<EnhancedItemRow {smartChangeset} key="shopifyAlt">Shopify Alternate</EnhancedItemRow>
					{/if}
				</div>
			</div>

			<!-- <ul>
				<li>Title: {$res.title}</li>
				<li>Price: ${$res.priceCents ? $res.priceCents / 100 : null}</li>
				<li>Flyer Price: ${$res.flyerPriceCents ? $res.flyerPriceCents / 100 : null}</li>
				<li>Alt Price: ${$res.altPriceCents ? $res.altPriceCents / 100 : null}</li>
				<li>Alt Flyer Price: ${$res.altFlyerPriceCents ? $res.altFlyerPriceCents / 100 : null}</li>
				<li>Cost: ${$res.costCents ? $res.costCents / 100 : null}</li>
				<li>SKU: {$res.sku}</li>
				<li>Barcode: {$res.barcode}</li>
			</ul> -->

			<p class="whitespace-pre-wrap">Item {JSON.stringify($res, undefined, 2)}</p>
		</div>
	{/await}
{/if}
