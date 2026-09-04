<script lang="ts">
	import type { Snippet } from 'svelte';
	import Image from '$lib/Image.svelte';

	interface Props {
		name: string;
		href: string;
		qbId: string;
		upc?: string | null;
		image?: string | null;
		imageDescription?: string | null;
		selected?: boolean;
		/** Omit to render the row without a checkbox. */
		onSelect?: (selected: boolean) => void;
		/** One line under the identifiers: whatever the surrounding list cares about. */
		meta?: Snippet;
	}

	let {
		name,
		href,
		qbId,
		upc = null,
		image = null,
		imageDescription = null,
		selected = false,
		onSelect,
		meta
	}: Props = $props();
</script>

<div class="flex min-w-0 flex-1 items-start gap-3">
	{#if onSelect}
		<label class="mt-7 grid shrink-0 place-content-center rounded" title="Select item">
			<input
				type="checkbox"
				class="checkbox border-2 border-surface-500 bg-white dark:border-surface-100 dark:bg-surface-900 dark:checked:border-primary-400 dark:checked:bg-primary-500"
				checked={selected}
				onchange={(event) => onSelect?.(event.currentTarget.checked)}
			/>
			<span class="sr-only">Select {name}</span>
		</label>
	{/if}

	<a
		{href}
		class="grid h-20 w-20 shrink-0 place-content-center overflow-hidden rounded-md border border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900"
		title="Open item details"
	>
		{#if image}
			<Image
				src={image}
				alt={imageDescription ?? `Image of ${name}`}
				class="h-20 w-20 object-contain p-1.5"
				thumbnail
			/>
		{:else}
			<span class="px-2 text-center text-xs text-surface-500 dark:text-surface-300">No image</span>
		{/if}
	</a>

	<div class="min-w-0 flex-1">
		<a {href} class="font-semibold leading-tight hover:underline">{name}</a>
		<p class="mt-0.5 break-all text-xs text-surface-500 dark:text-surface-300">
			{qbId}{upc ? ` · UPC ${upc}` : ''}
		</p>
		{#if meta}
			<p class="mt-1 text-xs text-surface-600 dark:text-surface-300">{@render meta()}</p>
		{/if}
	</div>
</div>
