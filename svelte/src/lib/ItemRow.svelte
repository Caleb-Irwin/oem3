<script lang="ts" module>
	export type SelectFunc = undefined | ((selection: { uniref: number; id: number }) => any);
</script>

<script lang="ts">
	import CopyableText from './helpers/CopyableText.svelte';
	import { productDetails, type RawProduct } from './productDetails';

	interface Props {
		rawProduct: { uniId: number } & RawProduct;
		grid?: boolean;
		all?: boolean;
		select?: SelectFunc;
		extraClass?: string;
		newTab?: boolean;
	}

	let {
		rawProduct,
		grid = false,
		all = false,
		select = undefined,
		extraClass = '',
		newTab = false
	}: Props = $props();

	let product = productDetails(rawProduct);
</script>

{#if product}
	<div
		class="card max-w-none w-full h-full p-2 flex justify-center items-center {grid
			? 'flex-col'
			: 'flex-row flex-wrap'} {extraClass}"
	>
		{#if product.imageUrl}
			<a
				class="{grid ? 'w-full' : 'h-20 w-20'} aspect-square p-1 card hover:cursor-pointer"
				href={'/app/resource/' + rawProduct.uniId}
				target={newTab ? '_blank' : '_self'}
			>
				<img
					src={product.imageUrl.startsWith('https://shopofficeonline.com/ProductImages/') &&
					product.imageUrl.endsWith('.jpg')
						? `/app/resource/guildThumb/${product.imageUrl.slice(product.imageUrl.indexOf('https://shopofficeonline.com/ProductImages/') + 43)}`
						: product.imageUrl.startsWith('https://img.shopofficeonline.com/venxia') &&
							  product.imageUrl.endsWith('.png')
							? `/app/resource/guildThumb/${encodeURIComponent(product.imageUrl.slice(product.imageUrl.indexOf('https://img.shopofficeonline.com/venxia') + 40))}`
							: product.imageUrl.startsWith('https://cdn.shopify.com/')
								? product.imageUrl.includes('?')
									? product.imageUrl + '&width=256'
									: product.imageUrl + '?width=256'
								: product.imageUrl}
					alt="Image for {product.sku}"
					class="w-full rounded-sm"
					loading="lazy"
				/>
			</a>
		{/if}

		<div class="{grid ? 'px-1' : 'px-2'} flex-grow-[10] w-full basis-12">
			<a
				href={'/app/resource/' + rawProduct.uniId}
				class="font-semibold hover:underline block w-full {product.name ? '' : 'italic'}"
				target={newTab ? '_blank' : '_self'}>{product.name || 'Unnamed Item'}</a
			>
			<p class="my-1">
				<span class="text-lg {product.comparePrice ? 'text-primary-600' : ''}">
					{product.price}
				</span>
				{#if product.comparePrice}
					<span class="pl-1 text-lg line-through">
						{product.comparePrice}
					</span>
				{/if}
				<span class="chip variant-soft-tertiary m-0.5">
					<CopyableText text={product.sku} />
				</span>
				{#if product.stock !== null}
					<span
						class="cursor-default chip m-0.5 {(product?.stock ?? 0) > 0
							? 'variant-filled-secondary'
							: 'variant-filled-warning'}"
					>
						{product.stock} in stock
					</span>
				{/if}
				{#if product.deleted}
					<span class="cursor-default chip m-0.5 variant-filled-error"> Deleted </span>
				{/if}
				{#if all}
					<span class="cursor-default chip m-0.5 variant-filled-surface">
						{product.idText.split('#')[0]}
					</span>
				{/if}
			</p>
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
