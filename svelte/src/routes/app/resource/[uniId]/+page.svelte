<script lang="ts">
	import type { PageData } from './$types';
	import type { history as historyType } from '../../../../../../server/src/db.schema';
	import History from '$lib/History.svelte';
	import type { Product } from '$lib/productDetails';
	import CopyableText from '$lib/helpers/CopyableText.svelte';
	import DOMPurify from 'isomorphic-dompurify';
	import EnhancedImages from './EnhancedContent.svelte';
	import Image from '$lib/Image.svelte';
	import { imageRedirect } from '$lib/imageRedirector';
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const store = getContext('resProduct') as Readable<{
		res: typeof data.res;
		product: Product | undefined;
	}>;

	const res = $derived($store.res),
		product = $derived($store.product);

	let history: (typeof historyType.$inferSelect)[] = $derived(
		res ? (res as any)['history'] : undefined
	);
</script>

{#if data.res === null}
	<p class="text-center text-xl">Resource not found</p>
{:else}
	{#if product}
		<div class="card m-2 p-4">
			<div class="flex flex-col md:flex-row">
				{#if product.imageUrl}
					<div
						class="p-2 w-full flex flex-col justify-center md:block md:min-w-96 md:max-w-96 lg:min-w-[512px] lg:max-w-[512px]"
					>
						<a
							class="w-full flex justify-center aspect-square"
							href={imageRedirect(product.imageUrl)}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Image src={product.imageUrl} alt="" class="rounded p-2 bg-white w-full" />
						</a>
						{#if product.otherImageUrls}
							<div class="pt-1 w-full grid grid-cols-2">
								{#each product.otherImageUrls as image, i}
									<a
										class="w-full flex justify-center py-1 {i % 2 === 0 ? 'pr-1' : 'pl-1'}"
										href={image}
										target="_blank"
									>
										<Image src={image} alt="" class="rounded bg-white w-full p-0.5" thumbnail />
									</a>
								{/each}
							</div>
						{/if}
						{#if product.idText.startsWith('SPRFlatFile#') || product.idText.startsWith('GuildData#')}
							<EnhancedImages
								etilizeId={product.other['Etilize ID'] ?? undefined}
								gid={product.idText.startsWith('GuildData#') ? product.sku : undefined}
							/>
						{/if}
					</div>
				{/if}
				<div class="p-2 w-full">
					<div class="flex items-start justify-between">
						<h1 class="h1 {product.name ? '' : 'italic'}">
							<CopyableText text={product.name || 'Unnamed Item'} />
						</h1>
					</div>
					<h2 class="py-2 h2 font-semibold flex flex-wrap align-middle">
						<span class={product.comparePrice ? 'text-primary-600' : ''}>
							<CopyableText text={product.price} />
						</span>
						{#if product.comparePrice}
							<span class="pl-1 line-through">
								<CopyableText text={product.comparePrice} />
							</span>
						{/if}
						<span class="flex-grow"></span>
						<span class="cursor-default chip text-md variant-soft-tertiary m-1">
							<CopyableText text={product.sku} />
						</span>
						{#if product.stock !== null}
							<span
								class="cursor-default chip m-1 {(product?.stock ?? 0) > 0
									? 'variant-filled-secondary'
									: 'variant-filled-warning'}"
							>
								<CopyableText text={product.stock?.toString()} /><span> in stock</span>
							</span>
						{/if}

						{#if product.deleted}
							<span class="cursor-default chip m-1 variant-filled-error"> Deleted </span>
						{/if}
					</h2>
					{#if product.description}
						<p class="pb-2">{@html DOMPurify.sanitize(product.description)}</p>
					{/if}
					<div class="grid grid-cols-2">
						{#each Object.entries(product.other) as [key, value], i}
							<p
								class="text-right font-semibold p-0.5 pr-1 {i % 2 === 0
									? 'bg-surface-200 dark:bg-surface-500'
									: ''}"
							>
								{key}
							</p>
							<p
								class="p-0.5 {i % 2 === 0 ? 'bg-surface-200 dark:bg-surface-500' : ''} {value ===
								null
									? 'italic'
									: ''}"
							>
								<CopyableText text={value ?? 'Undefined'} />
							</p>
						{/each}
					</div>
				</div>
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
