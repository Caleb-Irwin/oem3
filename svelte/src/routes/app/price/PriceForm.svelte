<script lang="ts">
	import Form from '$lib/Form.svelte';
	import Image from '$lib/Image.svelte';
	import { client } from '$lib/client';
	import { formatPrice } from '$lib/formatPrice';

	interface Props {
		item: Awaited<ReturnType<typeof client.product.priceList.item.query>>;
	}

	let { item }: Props = $props();

	const initialPrice =
		item.customPriceCents ?? item.recommendedPriceCents ?? item.quickBooksPriceCents;

	const displayPrice = (price: number | null) =>
		price === null ? 'Not available' : formatPrice(price / 100);
</script>

<Form
	action={client.product.priceList.set}
	input={{ uniId: item.uniId }}
	modalMode
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
				class="h-20 w-20 shrink-0 rounded-md bg-surface-100 dark:bg-surface-700 grid place-content-center text-xs text-surface-500"
			>
				No image
			</div>
		{/if}
		<div class="min-w-0">
			<h4 class="h4 font-semibold">{item.hasCustomPrice ? 'Edit' : 'Add'} Custom Price</h4>
			<p class="line-clamp-2">{item.title ?? 'Unnamed Product'}</p>
			<p class="text-sm text-surface-500">{item.gid ?? item.sprc ?? item.upc ?? 'No product ID'}</p>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-2 w-full pb-2 text-center">
		<div class="rounded-md variant-soft-secondary p-2">
			<p class="text-xs uppercase tracking-wide">Recommended</p>
			<p class="font-semibold">{displayPrice(item.recommendedPriceCents)}</p>
		</div>
		<div class="rounded-md variant-soft-tertiary p-2">
			<p class="text-xs uppercase tracking-wide">QuickBooks</p>
			<p class="font-semibold">{displayPrice(item.quickBooksPriceCents)}</p>
		</div>
	</div>

	<label class="label w-full py-1">
		<span class="font-semibold">Custom Price</span>
		<div class="input-group grid-cols-[auto_1fr]">
			<div class="input-group-shim">$</div>
			<input
				type="number"
				name="price"
				min="0"
				step="0.01"
				required
				placeholder="0.00"
				value={initialPrice === null ? '' : (initialPrice / 100).toFixed(2)}
			/>
		</div>
	</label>
	<button class="btn variant-filled-primary w-full mt-2">
		{item.hasCustomPrice ? 'Save Custom Price' : 'Add to Price List'}
	</button>
</Form>
