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
				<h2 class="h2 font-semibold">
					<NullableText text={price.value ? formatCurrency((price.value as number) / 100) : null} />
				</h2>
			</div>
			<div>
				<SettingButton cell={price} />
			</div>
		</div>
		<Settings cell={price} />
	</div>
	{#if comparePrice}
		<div class="card p-2">
			<div class="flex flex-row items-center justify-between">
				<div>
					<p class="text-lg font-bold flex-grow">Compare Price</p>
					<h2 class="h2 font-semibold">
						<span class="pl-1 {comparePrice.value === null ? '' : 'line-through'}">
							<NullableText
								text={comparePrice.value
									? formatCurrency((comparePrice.value as number) / 100)
									: null}
							/>
						</span>
					</h2>
				</div>
				<div>
					<SettingButton cell={comparePrice} />
				</div>
			</div>
			<Settings cell={comparePrice} />
		</div>
	{/if}
</div>
