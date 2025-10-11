<script lang="ts" module>
	export type SelectFunc = undefined | ((selection: { uniref: number; id: number }) => any);
</script>

<script lang="ts">
	import CopyableText from './helpers/CopyableText.svelte';
	import Image from './Image.svelte';
	import { productDetails, type Connection, type RawProduct } from './productDetails';
	import Link from 'lucide-svelte/icons/link';
	import Unlink from 'lucide-svelte/icons/unlink';

	interface Props {
		rawProduct: { uniId: number } & RawProduct;
		grid?: boolean;
		all?: boolean;
		select?: SelectFunc;
		extraClass?: string;
		replaceClass?: string | undefined;
		newTab?: boolean;
	}

	let {
		rawProduct,
		grid = false,
		all = false,
		select = undefined,
		extraClass = '',
		replaceClass = undefined,
		newTab = false
	}: Props = $props();

	let product = $derived(productDetails(rawProduct));
</script>

{#if product}
	<div
		class={replaceClass
			? replaceClass
			: `card max-w-none w-full h-full p-2 flex justify-center items-center ${
					grid ? 'flex-col' : 'flex-row flex-wrap'
				} ${extraClass}`}
	>
		{#if product.imageUrl}
			<a
				class="{grid ? 'w-full' : 'h-20 w-20'} aspect-square p-1 card hover:cursor-pointer"
				href={`/app/resource/${rawProduct.uniId}${rawProduct.unifiedGuild ? '/unified' : ''}`}
				target={newTab ? '_blank' : '_self'}
			>
				<Image
					src={product.imageUrl}
					alt="Image for {product.sku}"
					class="w-full rounded-sm"
					thumbnail
				/>
			</a>
		{/if}

		<div class="{grid ? 'px-1' : 'px-2'} flex-grow-[10] w-full basis-12">
			<a
				href={'/app/resource/' + rawProduct.uniId}
				class="font-semibold hover:underline block w-full {product.name ? '' : 'italic'}"
				target={newTab ? '_blank' : '_self'}>{product.name || 'Unnamed Item'}</a
			>
			<div class="py-1 flex flex-wrap gap-1">
				{#if product.price}
					<p class="text-lg {product.comparePrice ? 'text-primary-600' : ''}">
						{product.price}
					</p>
				{/if}

				{#if product.comparePrice}
					<p class="text-lg line-through">
						{product.comparePrice}
					</p>
				{/if}
				<p class="chip variant-soft-tertiary">
					<CopyableText text={product.sku} />
				</p>
				{#if product.stock !== null}
					<p
						class="cursor-default chip {(product?.stock ?? 0) > 0
							? 'variant-filled-secondary'
							: 'variant-filled-warning'}"
					>
						{product.stock} in stock
					</p>
				{/if}

				{#each product.connections ?? [] as connection}
					{@render displayConnection(connection)}
				{/each}

				{#if product.deleted}
					<p class="cursor-default chip variant-filled-error">Deleted</p>
				{/if}
				{#if all}
					<p class="cursor-default chip variant-filled-surface">
						{product.idText.split('#')[0]}
					</p>
				{/if}
			</div>
		</div>

		{#if select}
			<div class="w-full h-2 lg:hidden"></div>

			<div class={grid ? 'mt-0.5' : ''}>
				<button
					class="btn variant-filled-primary font-semibold"
					onclick={() => select({ uniref: rawProduct.uniId, id: product.id })}>Select</button
				>
			</div>
		{/if}
	</div>
{/if}

{#snippet displayConnection({ name, connected, link, unmatchedVariant }: Connection)}
	<a
		href={link}
		class="cursor-default chip {connected
			? 'variant-filled-primary cursor-pointer hover:underline'
			: (unmatchedVariant ?? 'variant-filled-warning')}"
		target={newTab ? '_blank' : '_self'}
	>
		<span>
			{#if connected}
				<Link size="16" />
			{:else}
				<Unlink size="16" />
			{/if}
		</span>
		<span> {name} </span>
	</a>
{/snippet}
