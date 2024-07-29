<script lang="ts">
	import { client, query } from '$lib/client';
	import { ProgressBar } from '@skeletonlabs/skeleton';
	import type { PageData } from './$types';
	import type { history as historyType } from '../../../../../../server/src/db.schema';
	import History from '$lib/History.svelte';
	import { productDetails } from '$lib/productDetails';

	export let data: PageData;

	const res = query(client.resources.get, { uniId: parseInt(data.uniId), includeHistory: true });
	let history: (typeof historyType.$inferSelect)[];
	$: history = $res ? ($res as any)['history'] : undefined;

	$: product = $res ? productDetails($res) : undefined;
</script>

{#if $res === undefined}
	<div class="px-4">
		<ProgressBar />
	</div>
{:else if $res === null}
	<p class="text-center text-xl">Resource not found</p>
{:else}
	{#if product}
		<div class="card m-2 p-6">
			<h1 class="h1 {product.name ? '' : 'italic'}">
				{product.name || 'Unnamed Item'}
			</h1>
			<h2 class="py-2 h2 font-semibold flex flex-wrap align-middle">
				<span>
					{product.price}
				</span>
				<span class="flex-grow" />
				<span class="cursor-default chip text-md variant-soft-tertiary m-1">
					{product.sku}
				</span>
				<span
					class="cursor-default chip m-1 {(product?.stock ?? 0) > 0
						? 'variant-filled-secondary'
						: 'variant-filled-warning'}"
				>
					{product.stock} in stock
				</span>
				{#if product.deleted}
					<span class="cursor-default chip m-1 variant-filled-error"> Deleted </span>
				{/if}
			</h2>
			{#if product.description}
				<p class="pb-2">{product.description}</p>
			{/if}
			<div class="grid grid-cols-2">
				{#each Object.entries(product.other) as [key, value], i}
					<p class="text-right font-semibold p-0.5 pr-1 {i % 2 === 0 ? 'bg-surface-500' : ''}">
						{key}
					</p>
					<p class="p-0.5 {i % 2 === 0 ? 'bg-surface-500' : ''}">{value}</p>
				{/each}
			</div>
			<p class="text-center italic">
				{product.idText} was last updated {new Date(product.lastUpdated).toLocaleString()}
			</p>
		</div>
	{/if}

	<div class="p-2">
		{#if history}
			<History {history} />
		{/if}
	</div>
{/if}
