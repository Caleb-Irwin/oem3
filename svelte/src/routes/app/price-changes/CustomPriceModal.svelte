<script lang="ts">
	import Form from '$lib/Form.svelte';
	import Button from '$lib/Button.svelte';
	import { client } from '$lib/client';
	import { formatPrice } from '$lib/formatPrice';
	import PriceBreakdown from '../price/PriceBreakdown.svelte';
	import PriceChangeIdentity from './PriceChangeIdentity.svelte';
	import type { PriceChangeItem } from './types';

	interface Props {
		item: PriceChangeItem;
	}

	let { item }: Props = $props();

	let target = $state<'online' | 'quickBooks'>('quickBooks');
	const existing = $derived(target === 'online' ? item.customOnline : item.customQuickBooks);
	const startingPriceCents = $derived(
		target === 'online' ? (item.onlinePriceCents ?? item.targetPriceCents) : item.targetPriceCents
	);

	let price = $state<number | undefined>(undefined);
	let approveOnUnderlyingChange = $state(false);

	// Reset the field whenever the target switches so it always shows that cell's own value.
	$effect(() => {
		price = (existing?.priceCents ?? startingPriceCents) / 100;
		approveOnUnderlyingChange = existing?.confType === 'setting:approveCustom';
	});
</script>

<div class="card flex w-[calc(100vw-2rem)] max-w-md flex-col gap-3 p-4">
	<PriceChangeIdentity {item} />

	<div class="flex w-full items-center rounded-full p-1 variant-glass-secondary">
		<button
			type="button"
			class="btn m-0.5 flex-1 {target === 'quickBooks' ? 'variant-glass-primary' : 'variant-glass'}"
			onclick={() => (target = 'quickBooks')}
		>
			QuickBooks only
		</button>
		<button
			type="button"
			class="btn m-0.5 flex-1 {target === 'online' ? 'variant-glass-primary' : 'variant-glass'}"
			onclick={() => (target = 'online')}
		>
			Online price
		</button>
	</div>

	<p class="text-sm text-surface-600 dark:text-surface-300">
		{#if target === 'online'}
			Sets the online price, which the store shows and the QuickBooks target follows.
		{:else}
			Sets the QuickBooks target only. The online price keeps following its own sources.
		{/if}
	</p>

	<Form
		action={client.priceChanges.setCustomPrice}
		input={{ productRow: item.productRow, target, approveOnUnderlyingChange }}
		modalMode
		noReset
		class="!max-w-none !p-0"
		successMessage="Custom price saved"
	>
		<label class="label w-full">
			<span class="font-bold">Custom price</span>
			<div class="input-group grid-cols-[auto_minmax(0,1fr)]">
				<div class="input-group-shim">$</div>
				<input
					class="w-full"
					type="number"
					name="price"
					min="0"
					step="0.01"
					required
					placeholder="0.00"
					bind:value={price}
				/>
			</div>
		</label>

		<label class="flex w-full items-center py-2">
			<input class="checkbox" type="checkbox" bind:checked={approveOnUnderlyingChange} />
			<span class="pl-2 text-sm">Approve custom value on underlying value change</span>
		</label>

		<div class="w-full">
			<PriceBreakdown
				customPriceCents={price === undefined ? null : Math.round(price * 100)}
				guildPriceCents={item.guildPriceCents}
				novexcoPriceCents={item.novexcoPriceCents}
				quickBooksPriceCents={item.currentPriceCents}
				guildCostCents={item.guildCostCents}
				novexcoCostCents={item.novexcoCostCents}
				quickBooksCostCents={item.quickBooksCostCents}
				guildUm={item.guildUm}
				novexcoUm={item.sprUm}
				quickBooksUm={item.quickBooksUm}
				compact
			/>
		</div>

		<button class="btn mt-2 w-full variant-ghost-primary">
			{existing ? 'Update custom price' : 'Set custom price'}
		</button>
	</Form>

	{#if existing}
		<div class="flex items-center justify-between gap-2 text-sm">
			<span class="text-surface-600 dark:text-surface-300">
				Currently pinned to {existing.priceCents === null
					? 'no value'
					: formatPrice(existing.priceCents / 100)}
			</span>
			<Button
				class="btn btn-sm variant-ghost-error"
				action={client.priceChanges.clearCustomPrice}
				input={{ productRow: item.productRow, target }}
				successMessage="Custom price removed"
			>
				Remove
			</Button>
		</div>
	{/if}
</div>
