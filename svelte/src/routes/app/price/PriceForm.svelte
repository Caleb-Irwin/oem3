<script lang="ts">
	import Form from '$lib/Form.svelte';
	import Image from '$lib/Image.svelte';
	import { client } from '$lib/client';
	import PriceBreakdown from './PriceBreakdown.svelte';

	interface Props {
		item: Awaited<ReturnType<typeof client.product.priceList.item.query>>;
	}

	let { item }: Props = $props();

	const initialPrice =
		item.customPriceCents ?? item.recommendedPriceCents ?? item.quickBooksPriceCents;
	let customPrice = $state(initialPrice === null ? undefined : initialPrice / 100);

	const formattedUm = $derived(
		item.um ? `${item.um.toUpperCase()}${item.qtyPerUm ? ` · ${item.qtyPerUm}/UM` : ''}` : '—'
	);
</script>

<Form
	action={client.product.priceList.set}
	input={{ uniId: item.uniId }}
	modalMode
	class="w-[calc(100vw-2rem)] min-w-0 overflow-hidden"
	successMessage={item.hasCustomPrice ? 'Custom price updated' : 'Custom price added'}
>
	<div class="flex w-full items-center gap-3 pb-3">
		{#if item.primaryImage}
			<Image
				src={item.primaryImage}
				alt={item.primaryImageDescription ?? `Image of ${item.title ?? 'product'}`}
				class="h-20 w-20 rounded-md object-contain bg-white"
				thumbnail
			/>
		{:else}
			<div
				class="h-20 w-20 shrink-0 rounded-md bg-surface-100 dark:bg-surface-700 grid place-content-center text-xs text-surface-600 dark:text-surface-300"
			>
				No image
			</div>
		{/if}
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<h4 class="h4 font-semibold">{item.hasCustomPrice ? 'Edit' : 'Add'} Custom Price</h4>
				{#if item.deleted}
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-error-200 px-2 py-0.5 text-xs font-semibold text-error-900 dark:bg-error-800 dark:text-error-100 whitespace-nowrap"
					>
						<span class="h-1.5 w-1.5 rounded-full bg-current opacity-80"></span>
						Deleted item
					</span>
				{/if}
			</div>
			<p class="line-clamp-2">{item.title ?? 'Unnamed Product'}</p>
			<p class="text-sm text-surface-600 dark:text-surface-300 flex flex-wrap gap-x-1.5">
				{#if item.gid}<span>GID {item.gid}</span>{/if}
				{#if item.gid && item.sprc}<span aria-hidden="true">·</span>{/if}
				{#if item.sprc}<span>SPRC {item.sprc}</span>{/if}
				{#if (item.gid || item.sprc) && item.upc}<span aria-hidden="true">·</span>{/if}
				{#if item.upc}<span class="font-semibold">UPC {item.upc}</span>{/if}
			</p>
		</div>
	</div>

	<div class="flex items-stretch gap-2 w-full min-w-0">
		<label
			class="label min-w-0 flex-grow p-2.5 rounded-md border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800"
		>
			<span class="font-bold">Custom Price</span>
			<div class="input-group grid-cols-[auto_minmax(0,1fr)] min-w-0 w-full">
				<div class="input-group-shim">$</div>
				<input
					class="min-w-0 w-full"
					type="number"
					name="price"
					min="0"
					step="0.01"
					required
					placeholder="0.00"
					bind:value={customPrice}
				/>
			</div>
		</label>
		<div
			class="shrink-0 rounded-md border border-surface-300 dark:border-surface-600 px-3 py-2 flex flex-col justify-center"
		>
			<span class="text-xs uppercase tracking-wide text-surface-600 dark:text-surface-300">UM</span>
			<strong>{formattedUm}</strong>
		</div>
	</div>

	<div class="w-full pt-2">
		<PriceBreakdown
			customPriceCents={customPrice === undefined ? null : Math.round(customPrice * 100)}
			guildPriceCents={item.guildPriceCents}
			novexcoPriceCents={item.novexcoPriceCents}
			quickBooksPriceCents={item.quickBooksPriceCents}
			guildCostCents={item.guildCostCents}
			novexcoCostCents={item.novexcoCostCents}
			quickBooksCostCents={item.quickBooksCostCents}
			compact
		/>
	</div>
	<button class="btn variant-filled-primary w-full mt-2">
		{item.hasCustomPrice ? 'Save Custom Price' : 'Add to Price List'}
	</button>
</Form>
