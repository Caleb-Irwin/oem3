<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import ItemRow from '$lib/ItemRow.svelte';
	import type { Product, RawProduct } from '$lib/productDetails';
	import OldSearch from '$lib/search/OldSearch.svelte';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Link from 'lucide-svelte/icons/link';
	import Unlink from 'lucide-svelte/icons/unlink';
	import type { QueryType } from '../../../../../../server/src/routers/search';
	import Check from 'lucide-svelte/icons/check';
	import { UnifiedTableNamesReadable } from '$lib/summary/tableNames';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import QuickAddModal from './QuickAddModal.svelte';

	interface Props {
		unmatchedMode: boolean;
		product: Product | undefined;
		uniId: number;
		tableName: string;
		resourceType: string;
	}
	let { unmatchedMode, product, uniId, tableName, resourceType }: Props = $props();

	const unifiedItem:
		| {
				title: string;
				name: string;
				item: Product['unifiedGuildData'];
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
		return undefined;
	});

	const isUnmatched = $derived(unifiedItem && unifiedItem.item === null);

	const modalStore = getModalStore();
</script>

{#if unmatchedMode}
	<div class="sticky top-0 z-10 p-2 pb-0">
		<div
			class="w-full p-2 card {!isUnmatched
				? 'variant-ghost-primary'
				: 'variant-ghost-error'} backdrop-blur-md relative"
		>
			<div class="flex items-center justify-between p-1 {!isUnmatched ? 'pb-1.5' : ''}">
				<div class="flex items-center space-x-2">
					<h3 class="h3 font-bold">
						Unmatched {UnifiedTableNamesReadable[
							tableName as keyof typeof UnifiedTableNamesReadable
						] ?? 'TODO'} Items
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
						class="btn w-36 {!isUnmatched ? 'variant-filled-primary' : 'variant-soft-surface'}"
						action={client.unified.getUnmatchedUrl}
						queryMode
						input={{
							currentUniId: uniId,
							mode: 'next',
							urlHash: page.url.hash
						}}
						res={async (output) => goto(output.url)}
					>
						<span class="flex-grow">{!isUnmatched ? 'Continue' : 'Skip'}</span>
						<ChevronRight />
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if unifiedItem}
	<div class="card variant-soft p-1 m-2 flex flex-row items-center justify-around flex-wrap">
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
			<div class="flex flex-col items-center p-2">
				<p class="text-lg font-semibold">No Connection</p>
				<p class="text-sm pb-2 text-center">
					Add a custom value setting in a {unifiedItem.name} item to add a connection or quick add
				</p>
				<div class="flex flex-row items-center justify-center w-full gap-2 flex-wrap">
					<div class="flex-grow">
						<OldSearch
							quickAdd
							quickAddQueryType={unifiedItem.queryType}
							select={async (selection) => {
								if (selection.uniref) {
									modalStore.trigger({
										type: 'component',
										component: {
											ref: QuickAddModal,
											props: {
												uniId: selection.uniref,
												unifiedResourceType: unifiedItem.queryType,
												resourceType,
												unifiedTitle: unifiedItem.title,
												unifiedItemId: selection.id,
												resourceId: product!.id,
												unifiedColumn: unifiedItem.unifiedColumn
											}
										}
									});
								}
							}}
						/>
					</div>
					<button class="btn btn-lg variant-filled-warning">
						<span> <Check /> </span>
						<span> Allow Unmatched </span>
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}
