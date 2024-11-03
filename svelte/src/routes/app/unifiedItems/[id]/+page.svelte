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
	let alt: boolean = $state(!!(
		$res?.defaultAltConversionFactor !== undefined ||
		$res?.altUm !== undefined ||
		$res?.altPriceCents !== undefined ||
		$res?.qbAlt ||
		$res?.shopifyAlt
	));
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
			<h2 class="h2 p-1 pt-4">Matching</h2>
			<h3 class="h3 p-1">Guild</h3>
			<div class="grid gap-2 grid-cols-1 sm:grid-cols-3 px-2">
				<EnhancedItemRow {smartChangeset} key="guild">Guild Data</EnhancedItemRow>
				<EnhancedItemRow {smartChangeset} key="guildInventory">Guild Inventory</EnhancedItemRow>
				<EnhancedItemRow {smartChangeset} key="guildFlyer">Guild Flyer</EnhancedItemRow>
			</div>
			<div class="flex items-center">
				<h3 class="h3 pt-4 p-1">Unit of Measure</h3>
				<div class="flex-grow"></div>
				<button
					class="btn btn-sm h-8 variant-ghost-secondary text-secondary-500"
					onclick={() => (alt = !alt)}>{alt ? 'Hide' : 'Show'} Alternate UM</button
				>
			</div>
			<div class="flex flex-col lg:flex-row p-2 pt-0 gap-2">
				<SmartInput {smartChangeset} key="defaultUm" example="ea" />
				{#if alt}
					<SmartInput {smartChangeset} key="defaultAltConversionFactor" example="12" />
					<SmartInput {smartChangeset} key="altUm" example="pk" />
				{/if}
			</div>
			<h3 class="h3 pt-2 p-1">QuickBooks</h3>
			<div class="grid gap-2 grid-cols-1 {alt ? 'sm:grid-cols-2' : ''} px-2">
				<EnhancedItemRow {smartChangeset} key="qb">QuickBooks</EnhancedItemRow>
				{#if alt}
					<EnhancedItemRow {smartChangeset} key="qbAlt">QuickBooks Alternate</EnhancedItemRow>
				{/if}
			</div>
			<h3 class="h3 pt-2 p-1">Shopify</h3>
			<div class="grid gap-2 grid-cols-1 {alt ? 'sm:grid-cols-2' : ''} px-2">
				<EnhancedItemRow {smartChangeset} key="shopify">Shopify</EnhancedItemRow>
				{#if alt}
					<EnhancedItemRow {smartChangeset} key="shopifyAlt">Shopify Alternate</EnhancedItemRow>
				{/if}
			</div>
			<p class="whitespace-pre-wrap">Item {JSON.stringify($res, undefined, 2)}</p>
		</div>
	{/await}
{/if}
