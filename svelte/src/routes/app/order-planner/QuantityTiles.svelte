<script lang="ts">
	interface Props {
		quantityOnHand: number | null;
		availableQuantity: number | null;
		quantityOnPurchaseOrder: number | null;
		quantityOnSalesOrder: number | null;
	}

	let { quantityOnHand, availableQuantity, quantityOnPurchaseOrder, quantityOnSalesOrder }: Props =
		$props();

	const tiles = $derived([
		{ label: 'On hand', value: quantityOnHand, lead: true },
		{ label: 'Available', value: availableQuantity, lead: false },
		{ label: 'On PO', value: quantityOnPurchaseOrder, lead: false },
		{ label: 'On SO', value: quantityOnSalesOrder, lead: false }
	]);
</script>

<div class="grid grid-cols-4 gap-2 lg:w-[310px] lg:shrink-0">
	{#each tiles as tile (tile.label)}
		<div
			class="rounded-md px-2 py-1.5 text-center {tile.lead
				? 'bg-primary-100 dark:bg-primary-900/40'
				: 'bg-surface-100 dark:bg-surface-700'}"
		>
			<strong
				class="block text-xl tabular-nums {tile.lead
					? 'text-primary-800 dark:text-primary-200'
					: ''}"
			>
				{tile.value ?? '—'}
			</strong>
			<span
				class="text-[11px] {tile.lead
					? 'text-primary-800 dark:text-primary-200'
					: 'text-surface-600 dark:text-surface-300'}"
			>
				{tile.label}
			</span>
		</div>
	{/each}
</div>
