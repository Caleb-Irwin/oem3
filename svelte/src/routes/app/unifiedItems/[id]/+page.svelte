<script lang="ts">
	import { client, query } from '$lib/client';
	import { ProgressBar } from '@skeletonlabs/skeleton';
	import type { PageData } from './$types';
	import EnhancedItemRow from './EnhancedItemRow.svelte';
	import { getSmartChangeset } from './smartChangeset';
	import Changes from './Changes.svelte';
	import SmartInput from './SmartInput.svelte';

	export let data: PageData;
	const res = query(client.unifiedItems.item, { id: parseInt(data.id) });
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
			<h3 class="h3 pt-2 p-1">Unit of Measure</h3>
			<div class="flex">
				<SmartInput {smartChangeset} key="defaultUm" />
			</div>
			<h3 class="h3 pt-2 p-1">QuickBooks</h3>
			<div class="grid gap-2 grid-cols-1 sm:grid-cols-2 px-2">
				<EnhancedItemRow {smartChangeset} key="qb">QuickBooks</EnhancedItemRow>
				<EnhancedItemRow {smartChangeset} key="qbAlt">QuickBooks Alternate</EnhancedItemRow>
			</div>
			<h3 class="h3 pt-2 p-1">Shopify</h3>
			<div class="grid gap-2 grid-cols-1 sm:grid-cols-2 px-2">
				<EnhancedItemRow {smartChangeset} key="shopify">Shopify</EnhancedItemRow>
				<EnhancedItemRow {smartChangeset} key="shopifyAlt">Shopify Alternate</EnhancedItemRow>
			</div>
			<p class="whitespace-pre-wrap">Item {JSON.stringify($res, undefined, 2)}</p>
		</div>
	{/await}
{/if}
