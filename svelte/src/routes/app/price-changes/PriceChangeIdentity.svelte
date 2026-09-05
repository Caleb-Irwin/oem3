<script lang="ts">
	import Image from '$lib/Image.svelte';
	import type { PriceChangeItem } from './types';

	interface Props {
		item: PriceChangeItem;
		size?: 'sm' | 'lg';
	}

	let { item, size = 'sm' }: Props = $props();

	const box = $derived(size === 'lg' ? 'h-24 w-24' : 'h-12 w-12');
</script>

<div class="flex min-w-0 items-center gap-3">
	{#if item.primaryImage}
		<Image
			src={item.primaryImage}
			alt={item.primaryImageDescription ?? `Image of ${item.title ?? 'product'}`}
			class="{box} shrink-0 rounded-md bg-white object-contain"
			thumbnail
		/>
	{:else}
		<div
			class="{box} grid shrink-0 place-content-center rounded-md bg-surface-100 text-xs text-surface-600 dark:bg-surface-700 dark:text-surface-300"
		>
			No image
		</div>
	{/if}
	<div class="min-w-0">
		<p class="{size === 'lg' ? 'text-lg font-semibold' : 'font-semibold'} line-clamp-2">
			{item.title ?? 'Unnamed Product'}
		</p>
		<p class="flex flex-wrap gap-x-1.5 text-sm text-surface-600 dark:text-surface-300">
			{#if item.gid}<span>GID {item.gid}</span>{/if}
			{#if item.gid && item.sprc}<span aria-hidden="true">·</span>{/if}
			{#if item.sprc}<span>SPRC {item.sprc}</span>{/if}
			{#if (item.gid || item.sprc) && item.upc}<span aria-hidden="true">·</span>{/if}
			{#if item.upc}<span class="font-semibold">UPC {item.upc}</span>{/if}
		</p>
		<p class="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
			{#if item.inFlyer}
				<span class="badge variant-soft-warning">In flyer</span>
			{/if}
			<span class="badge variant-soft">
				{item.source === 'guild' ? 'Guild' : item.source === 'spr' ? 'SPR' : 'Other'} priced
			</span>
			{#if item.customOnline}
				<span class="badge variant-soft-secondary">Custom online price</span>
			{/if}
			{#if item.customQuickBooks}
				<span class="badge variant-soft-secondary">Custom QuickBooks price</span>
			{/if}
			{#if item.awaitingCustomApproval}
				<span class="badge variant-soft-error">Custom price needs approval</span>
			{/if}
		</p>
	</div>
</div>
