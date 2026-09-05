<script lang="ts">
	import Image from '$lib/Image.svelte';
	import type { PriceChangeItem } from './types';

	interface Props {
		item: PriceChangeItem;
		size?: 'sm' | 'lg';
		showUnifiedTitle?: boolean;
	}

	let { item, size = 'sm', showUnifiedTitle = false }: Props = $props();

	const box = $derived(size === 'lg' ? 'h-24 w-24' : 'h-12 w-12');
	const quickBooksTitle = $derived(
		item.qbDescription || item.qbProductName || item.title || 'Unnamed Product'
	);
</script>

<div class="flex min-w-0 items-center gap-3">
	<a
		class="shrink-0 rounded-md focus-visible:ring-2 focus-visible:ring-primary-500"
		href="/app/resource/{item.uniId}"
		aria-label="Open {quickBooksTitle}"
	>
		{#if item.primaryImage}
			<Image
				src={item.primaryImage}
				alt={item.primaryImageDescription ?? `Image of ${quickBooksTitle}`}
				class="{box} rounded-md bg-white object-contain transition-opacity hover:opacity-80"
				thumbnail
			/>
		{:else}
			<div
				class="{box} grid place-content-center rounded-md bg-surface-100 text-xs text-surface-600 transition-colors hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600"
			>
				No image
			</div>
		{/if}
	</a>
	<div class="min-w-0">
		{#if showUnifiedTitle}
			<p
				class="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400"
			>
				QuickBooks
			</p>
		{/if}
		<a
			class="anchor line-clamp-2 {size === 'lg' ? 'text-lg font-semibold' : 'font-semibold'}"
			href="/app/resource/{item.uniId}"
		>
			{quickBooksTitle}
		</a>
		{#if showUnifiedTitle}
			<p class="mt-1 line-clamp-2 text-sm text-surface-600 dark:text-surface-300">
				<span class="font-semibold">Unified:</span>
				{item.title ?? 'Unnamed Product'}
			</p>
		{/if}
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
