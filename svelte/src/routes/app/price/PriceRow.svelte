<script lang="ts">
	import Button from '$lib/Button.svelte';
	import Image from '$lib/Image.svelte';
	import { client } from '$lib/client';
	import { formatPrice } from '$lib/formatPrice';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import PriceBreakdown from './PriceBreakdown.svelte';

	interface Props {
		item: Awaited<ReturnType<typeof client.product.priceList.list.query>>[number];
		index: number;
		edit: (item: Props['item']) => void;
	}

	let { item, index, edit }: Props = $props();

	const displayPrice = (price: number | null) =>
		price === null ? '—' : formatPrice(price / 100);

	const formattedUm = $derived(
		item.um ? `${item.um.toUpperCase()}${item.qtyPerUm ? ` · ${item.qtyPerUm}/UM` : ''}` : '—'
	);
</script>

<li
	class="rounded-md overflow-hidden border text-surface-900 dark:text-surface-50 {item.deleted
		? 'border-error-400 dark:border-error-600 bg-error-50 dark:bg-error-900/20'
		: index % 2 === 0
			? 'border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-700'
			: 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800'}"
>
	<div class="flex items-stretch">
		<a
			href={`/app/resource/${item.uniId}/unified`}
			class="w-20 sm:w-24 shrink-0 bg-white grid place-content-center border-r border-surface-200"
			title="Open unified product"
		>
			{#if item.primaryImage}
				<Image
					src={item.primaryImage}
					alt={item.primaryImageDescription ?? `Image of ${item.title ?? 'product'}`}
					class="w-full aspect-square object-contain p-2 {item.deleted ? 'grayscale opacity-60' : ''}"
					thumbnail
				/>
			{:else}
				<span class="text-xs text-surface-500 text-center p-2">No image</span>
			{/if}
		</a>

		<div class="min-w-0 flex-grow p-2">
			<div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
				<div class="min-w-0 flex-grow">
					<div class="flex items-center gap-2">
						<a
							href={`/app/resource/${item.uniId}/unified`}
							class="font-semibold hover:underline line-clamp-2"
						>
							{item.title ?? 'Unnamed Product'}
						</a>
						{#if item.deleted}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-error-200 px-2 py-0.5 text-xs font-semibold text-error-900 dark:bg-error-800 dark:text-error-100 whitespace-nowrap"
								title="This unified product is marked as deleted"
							>
								<span class="h-1.5 w-1.5 rounded-full bg-current opacity-80"></span>
								Deleted item
							</span>
						{/if}
					</div>
					<p class="text-sm text-surface-600 dark:text-surface-300 flex flex-wrap gap-x-1.5">
						{#if item.gid}<span>GID {item.gid}</span>{/if}
						{#if item.gid && item.sprc}<span aria-hidden="true">·</span>{/if}
						{#if item.sprc}<span>SPRC {item.sprc}</span>{/if}
						{#if (item.gid || item.sprc) && item.upc}<span aria-hidden="true">·</span>{/if}
						{#if item.upc}<span class="font-semibold">UPC {item.upc}</span>{/if}
						{#if !item.gid && !item.sprc && !item.upc}<span>No product IDs</span>{/if}
					</p>
				</div>
				<div class="flex items-center justify-end shrink-0 gap-2.5">
					<div class="flex items-baseline gap-1.5">
						<strong class="text-xl leading-7 text-primary-700 dark:text-primary-300">
							{displayPrice(item.customPriceCents)}
						</strong>
						<strong class="text-base leading-7 whitespace-nowrap">{formattedUm}</strong>
					</div>
					<div class="flex items-center gap-1">
						<button
							class="h-8 w-8 shrink-0 cursor-pointer rounded grid place-content-center text-primary-700 transition-colors hover:bg-primary-100 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300 dark:hover:bg-primary-900/50 dark:hover:text-primary-200"
							title="Edit custom price"
							aria-label="Edit custom price"
							onclick={() => edit(item)}
						>
							<Pencil size={17} />
						</button>
						<Button
							action={client.product.priceList.remove}
							input={{ uniId: item.uniId }}
							confirm="Remove this custom price and return to automatic pricing?"
							successMessage="Custom price removed"
							class="h-8 w-8 shrink-0 cursor-pointer rounded grid place-content-center text-error-700 transition-colors hover:bg-error-100 hover:text-error-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500 dark:text-error-300 dark:hover:bg-error-900/50 dark:hover:text-error-200"
						>
							<Trash2 size={17} />
							<span class="sr-only">Remove custom price</span>
						</Button>
					</div>
				</div>
			</div>

			<div class="pt-1.5">
				<PriceBreakdown
					customPriceCents={item.customPriceCents}
					guildPriceCents={item.guildPriceCents}
					novexcoPriceCents={item.novexcoPriceCents}
					quickBooksPriceCents={item.quickBooksPriceCents}
					guildCostCents={item.guildCostCents}
					novexcoCostCents={item.novexcoCostCents}
					quickBooksCostCents={item.quickBooksCostCents}
				/>
			</div>
		</div>
	</div>
</li>
