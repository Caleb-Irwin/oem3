<script lang="ts">
	import { formatCurrency } from '$lib/productDetails';
	import NullableText from './NullableText.svelte';
	import type { Cell } from './types';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';

	interface Props {
		price: Cell;
		comparePrice?: Cell;
	}

	let { price, comparePrice }: Props = $props();
</script>

<div class="w-full grid lg:grid-cols-2 lg:space-x-2 lg:space-y-0 space-y-2">
	<div class="card p-2">
		<div class="flex flex-row items-center justify-between">
			<div>
				<p class="text-lg font-bold flex-grow">Price</p>
				{@render priceValueRenderer(price.value)}
			</div>
			<div>
				<SettingButton cell={price} />
			</div>
		</div>
		<Settings cell={price} valueRenderer={priceValueRenderer} />
	</div>
	{#if comparePrice}
		<div class="card p-2">
			<div class="flex flex-row items-center justify-between">
				<div>
					<p class="text-lg font-bold flex-grow">Compare Price</p>
					{@render comparePriceValueRenderer(comparePrice.value)}
				</div>
				<div>
					<SettingButton cell={comparePrice} />
				</div>
			</div>
			<Settings cell={comparePrice} valueRenderer={comparePriceValueRenderer} />
		</div>
	{/if}
</div>

{#snippet priceValueRenderer(value: string | number | boolean | null)}
	<h2 class="h2 font-semibold">
		<NullableText text={value ? formatCurrency((value as number) / 100) : null} />
	</h2>
{/snippet}

{#snippet comparePriceValueRenderer(value: string | number | boolean | null)}
	<h2 class="h2 font-semibold">
		<span class="pl-1 {value === null ? '' : 'line-through'}">
			<NullableText text={value ? formatCurrency((value as number) / 100) : null} />
		</span>
	</h2>
{/snippet}
