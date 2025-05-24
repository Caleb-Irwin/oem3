<script lang="ts">
	import Images from './Images.svelte';
	import Price from './Price.svelte';
	import TextBox from './TextBox.svelte';
	import Title from './Title.svelte';
	import type { Cell } from './types';

	interface Props {
		title: Cell;
		primaryImage: Cell;
		otherImages: Cell[];
		price: Cell;
		comparePrice?: Cell;
		description: Cell;
	}
	let { title, primaryImage, otherImages, price, comparePrice, description } = $props();
</script>

<div class="lg:p-2 flex flex-col md:flex-row w-full">
	<div>
		<Images primary={primaryImage} other={otherImages} />
	</div>
	<div class="p-2 w-full">
		<div class="flex items-start justify-between w-full">
			<Title cell={title} />
		</div>
		<div class="py-2 flex flex-wrap align-middle">
			<Price {price} {comparePrice} />
			<span class="flex-grow"></span>
			<!-- <span class="cursor-default chip text-md variant-soft-tertiary m-1">
				<CopyableText text={product.sku} />
			</span> -->
			<!-- {#if product.stock !== null}
				<span
					class="cursor-default chip m-1 {(product?.stock ?? 0) > 0
						? 'variant-filled-secondary'
						: 'variant-filled-warning'}"
				>
					<CopyableText text={product.stock?.toString()} /><span> in stock</span>
				</span>
			{/if} -->

			<!-- {#if product.deleted}
				<span class="cursor-default chip m-1 variant-filled-error"> Deleted </span>
			{/if} -->
		</div>
		<TextBox cell={description} />
	</div>
</div>
