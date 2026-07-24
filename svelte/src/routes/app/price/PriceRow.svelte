<script lang="ts">
	import Button from '$lib/Button.svelte';
	import Image from '$lib/Image.svelte';
	import { client } from '$lib/client';
	import { formatPrice } from '$lib/formatPrice';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';

	interface Props {
		item: Awaited<ReturnType<typeof client.product.priceList.list.query>>[number];
		index: number;
		edit: (item: Props['item']) => void;
	}

	let { item, index, edit }: Props = $props();

	const displayPrice = (price: number | null) =>
		price === null ? '—' : formatPrice(price / 100);
</script>

<li
	class="rounded-md overflow-hidden border border-surface-200 dark:border-surface-700 {index %
		2 ===
	0
		? 'bg-surface-100 dark:bg-surface-700'
		: 'bg-surface-50 dark:bg-surface-800'}"
>
	<div class="flex items-stretch">
		<a
			href={`/app/resource/${item.uniId}/unified`}
			class="w-24 sm:w-28 shrink-0 bg-white grid place-content-center border-r border-surface-200"
			title="Open unified product"
		>
			{#if item.primaryImage}
				<Image
					src={item.primaryImage}
					alt={item.primaryImageDescription ?? `Image of ${item.title ?? 'product'}`}
					class="w-full aspect-square object-contain p-2"
					thumbnail
				/>
			{:else}
				<span class="text-xs text-surface-500 text-center p-2">No image</span>
			{/if}
		</a>

		<div class="min-w-0 flex-grow p-2 sm:p-3">
			<div class="flex gap-2">
				<div class="min-w-0 flex-grow">
					<a
						href={`/app/resource/${item.uniId}/unified`}
						class="font-semibold hover:underline line-clamp-2"
					>
						{item.title ?? 'Unnamed Product'}
					</a>
					<p class="text-sm text-surface-500 truncate">
						{item.gid ?? item.sprc ?? item.upc ?? 'No product ID'}
					</p>
				</div>
				<div class="flex shrink-0">
					<button
						class="btn btn-icon btn-icon-sm text-primary-500"
						title="Edit custom price"
						aria-label="Edit custom price"
						onclick={() => edit(item)}
					>
						<Pencil />
					</button>
					<Button
						action={client.product.priceList.remove}
						input={{ uniId: item.uniId }}
						confirm="Remove this custom price and return to automatic pricing?"
						successMessage="Custom price removed"
						class="btn btn-icon btn-icon-sm text-error-500"
					>
						<Trash2 />
					</Button>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-2">
				<div class="rounded px-2 py-1 variant-soft-secondary">
					<p class="text-xs text-surface-600 dark:text-surface-300">Recommended</p>
					<p class="font-semibold">{displayPrice(item.recommendedPriceCents)}</p>
				</div>
				<div class="rounded px-2 py-1 variant-soft-primary">
					<p class="text-xs text-surface-600 dark:text-surface-300">Custom</p>
					<p class="font-semibold">{displayPrice(item.customPriceCents)}</p>
				</div>
				<div class="rounded px-2 py-1 variant-soft-tertiary">
					<p class="text-xs text-surface-600 dark:text-surface-300">QuickBooks</p>
					<p class="font-semibold">{displayPrice(item.quickBooksPriceCents)}</p>
				</div>
			</div>
		</div>
	</div>
</li>
