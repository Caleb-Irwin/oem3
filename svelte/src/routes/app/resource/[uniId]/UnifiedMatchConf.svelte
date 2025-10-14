<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import ItemRow from '$lib/ItemRow.svelte';
	import type { Product, RawProduct } from '$lib/productDetails';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Link from 'lucide-svelte/icons/link';
	import Unlink from 'lucide-svelte/icons/unlink';
	import type { QueryType } from '../../../../../../server/src/routers/search';
	import Check from 'lucide-svelte/icons/check';
	import { UnifiedTableNamesReadable } from '$lib/summary/tableNames';
	import QuickAdd from './QuickAdd.svelte';
	import X from 'lucide-svelte/icons/x';
	import Maximize_2 from 'lucide-svelte/icons/maximize-2';
	import Minimize_2 from 'lucide-svelte/icons/minimize-2';

	interface Props {
		unmatchedMode: boolean;
		allowUnmatched: boolean;
		product: Product | undefined;
		uniId: number;
		tableName: string;
		resourceType: string;
	}
	let { unmatchedMode, allowUnmatched, product, uniId, tableName, resourceType }: Props = $props();

	const unifiedItem:
		| {
				title: string;
				name: string;
				item:
					| Product['unifiedGuildData']
					| Product['unifiedSprData']
					| Product['unifiedProductData'];
				rawItem: ({ uniId: number } & RawProduct) | null;
				queryType: QueryType;
				unifiedColumn: string;
		  }
		| undefined = $derived.by(() => {
		if (product?.unifiedGuildData !== undefined)
			return {
				title: 'Unified Guild',
				name: 'unified guild',
				item: product.unifiedGuildData,
				rawItem: product.unifiedGuildData
					? {
							uniId: product.unifiedGuildData.uniref.uniId,
							unifiedGuildData: product.unifiedGuildData
						}
					: null,
				queryType: 'unifiedGuild',
				unifiedColumn: {
					guildData: 'dataRow',
					guildInventory: 'inventoryRow',
					guildFlyer: 'flyerRow'
				}[tableName]!
			};
		if (product?.unifiedSprData !== undefined)
			return {
				title: 'Unified SPR',
				name: 'unified spr',
				item: product.unifiedSprData,
				rawItem: product.unifiedSprData
					? {
							uniId: product.unifiedSprData.uniref.uniId,
							unifiedSprData: product.unifiedSprData
						}
					: null,
				queryType: 'unifiedSpr',
				unifiedColumn: {
					sprPriceFile: 'sprPriceFileRow',
					sprFlatFile: 'sprFlatFileRow'
				}[tableName]!
			};
		if (product?.unifiedProductData !== undefined)
			return {
				title: 'Unified Product',
				name: 'unified product',
				item: product.unifiedProductData,
				rawItem: product.unifiedProductData
					? {
							uniId: product.unifiedProductData.uniref.uniId,
							unifiedProductData: product.unifiedProductData
						}
					: null,
				queryType: 'unifiedProduct',
				unifiedColumn: {
					unifiedGuild: 'unifiedGuildRow',
					unifiedSpr: 'unifiedSprRow',
					qb: 'qbRow',
					shopify: 'shopifyRow'
				}[tableName]!
			};
		return undefined;
	});

	const isUnmatched = $derived(unifiedItem && unifiedItem.item === null);
	const isComplete = $derived(!isUnmatched || allowUnmatched);

	let quickAddExpanded = $state(unmatchedMode);
</script>

{#if unmatchedMode}
	<div class="sticky top-0 z-10 p-2 pb-0">
		<div
			class="w-full p-2 card {isComplete
				? 'variant-ghost-primary'
				: 'variant-ghost-error'} backdrop-blur-md relative"
		>
			<div class="flex items-center justify-between p-1">
				<div class="flex items-center space-x-2">
					<h3 class="h3 font-bold">
						Unmatched {UnifiedTableNamesReadable[
							tableName as keyof typeof UnifiedTableNamesReadable
						] ?? 'UNIFIED TABLE NAME NOT IMPLEMENTED'} Items
					</h3>
				</div>

				<div class="flex flex-wrap items-center gap-x-2 gap-y-2 justify-end">
					<Button
						class="btn w-36 variant-soft-surface"
						action={client.unified.getUnmatchedUrl}
						queryMode
						input={{
							currentUniId: uniId,
							mode: 'prev',
							urlHash: page.url.hash
						}}
						res={async (output) => goto(output.url)}
					>
						<ChevronLeft />
						<span class="flex-grow">Previous</span>
					</Button>
					<Button
						class="btn w-36 {isComplete ? 'variant-filled-primary' : 'variant-soft-surface'}"
						action={client.unified.getUnmatchedUrl}
						queryMode
						input={{
							currentUniId: uniId,
							mode: 'next',
							urlHash: page.url.hash
						}}
						res={async (output) => goto(output.url)}
					>
						<span class="flex-grow">{isComplete ? 'Continue' : 'Skip'}</span>
						<ChevronRight />
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if unifiedItem}
	<div class="card variant-soft p-1 m-2">
		<div class="flex flex-row items-center justify-around flex-wrap">
			<h3 class="h3 pl-3 pr-4 p-1 flex items-center gap-x-2 text-center justify-center">
				<span>
					{#if isUnmatched}
						<Unlink />
					{:else}
						<Link />
					{/if}
				</span>
				<span> {unifiedItem.title} Connection </span>
			</h3>
			{#if unifiedItem?.rawItem}
				<div class="px-4">
					<ItemRow
						newTab={true}
						replaceClass="flex justify-center items-center"
						rawProduct={unifiedItem.rawItem}
					/>
				</div>
			{:else}
				<div class="text-center p-1">
					<p class="text-lg font-semibold">No Connection</p>
					<p class="text-sm pb-2 text-center">
						Add a custom value setting in a {unifiedItem.name} item to add a connection or quick add
					</p>
				</div>

				<div class="flex flex-row items-center justify-center gap-2 flex-wrap pt-4 p-2">
					<button
						class="btn w-56 variant-glass-secondary"
						onclick={() => {
							quickAddExpanded = !quickAddExpanded;
						}}
					>
						{#if quickAddExpanded}
							<Minimize_2 />
							<span>Hide Quick Add</span>
						{:else}
							<Maximize_2 />
							<span>Show Quick Add</span>
						{/if}
					</button>
					<Button
						class="btn w-56 {allowUnmatched
							? 'variant-filled-secondary'
							: 'variant-filled-warning'} "
						action={client.unified.updateUnmatched}
						input={{
							uniId,
							allowUnmatched: !allowUnmatched,
							tableName
						}}
					>
						{#if allowUnmatched}
							<span> <X /> </span>
							<span> Disapprove Unmatched </span>
						{:else}
							<span> <Check /> </span>
							<span> Approve Unmatched </span>
						{/if}
					</Button>
				</div>
			{/if}
		</div>
		{#if quickAddExpanded && !unifiedItem?.rawItem}
			<div class="w-full">
				{#key product?.id}
					<QuickAdd
						baseSearch={(product?.keyProductIds || []).join(' ')}
						tableName={unifiedItem.queryType}
						unifiedResourceType={unifiedItem.queryType}
						{resourceType}
						unifiedTitle={unifiedItem.title}
						resourceId={product!.id}
						unifiedColumn={unifiedItem.unifiedColumn}
					/>
				{/key}
			</div>
		{/if}
	</div>
{/if}
