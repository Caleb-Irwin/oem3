<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import ItemRow from '$lib/ItemRow.svelte';
	import type { Product } from '$lib/productDetails';
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import Link from 'lucide-svelte/icons/link';
	import Unlink from 'lucide-svelte/icons/unlink';

	interface Props {
		unmatchedMode: boolean;
		product: Product | undefined;
		uniId: number;
	}
	let { unmatchedMode, product, uniId }: Props = $props();

	let isUnmatched = $state(
		product?.unifiedGuildData !== undefined && product?.unifiedGuildData === null
	);
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
					<h3 class="h3 font-bold">Unmatched Items</h3>
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

{#if product?.unifiedGuildData !== undefined}
	<div class="card variant-soft p-1 m-2 flex flex-row items-center flex-wrap">
		<div class="flex-grow"></div>
		<h3 class="h3 pl-3 pr-4 p-1 flex items-center gap-x-2">
			<span>
				{#if product.unifiedGuildData === null}
					<Unlink />
				{:else}
					<Link />
				{/if}
			</span>
			<span> Unified Guild Connection </span>
		</h3>
		<div class="flex-grow"></div>
		{#if product.unifiedGuildData}
			<div class="px-4">
				<ItemRow
					newTab={true}
					replaceClass="flex justify-center items-center"
					rawProduct={{
						uniId: product.unifiedGuildData.uniref.uniId,
						unifiedGuildData: product.unifiedGuildData
					}}
				/>
			</div>
		{:else}
			<div class="flex flex-col items-center p-2">
				<p class="text-lg">No Connection</p>
				<p class="text-sm">
					Add a custom value setting in a unified guild item to add a connection
				</p>
			</div>
		{/if}
		<div class="flex-grow"></div>
	</div>
{/if}
