<script lang="ts" context="module">
	export type SelectFunc = undefined | ((selection: { uniref: number }) => any);
</script>

<script lang="ts">
	import { productDetails, type RawProduct } from './productDetails';

	export let rawProduct: { uniId: number } & RawProduct,
		grid = false,
		select: SelectFunc;

	let product = productDetails(rawProduct);
</script>

{#if product}
	<div
		class="card max-w-none w-full h-full p-2 flex justify-center items-center {grid
			? 'flex-col'
			: 'flex-row flex-wrap'}"
	>
		{#if product.imageUrl}
			<a
				class="{grid ? 'w-full' : 'h-20 w-20'} aspect-square p-1 card hover:cursor-pointer"
				href={'/app/resource/' + rawProduct.uniId}
			>
				<img
					src={product.imageUrl}
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
				>{product.name || 'Unnamed Item'}</a
			>
			<p class="my-1">
				<span class="text-lg">
					{product.price}
				</span>
				<span class="chip variant-soft-tertiary">
					{product.sku}
				</span>
				{#if product.stock !== null}
					<span
						class="cursor-default chip m-1 {(product?.stock ?? 0) > 0
							? 'variant-filled-secondary'
							: 'variant-filled-warning'}"
					>
						{product.stock} in stock
					</span>
				{/if}
				{#if product.deleted}
					<span class="cursor-default chip m-1 variant-filled-error"> Deleted </span>
				{/if}
			</p>
		</div>

		{#if select}
			<div class="w-full h-2 lg:hidden" />

			<div class={grid ? 'mt-0.5' : ''}>
				<button
					class="btn variant-filled-primary font-semibold"
					on:click={() => select({ uniref: rawProduct.uniId })}>Select</button
				>
			</div>
		{/if}
	</div>
{/if}
