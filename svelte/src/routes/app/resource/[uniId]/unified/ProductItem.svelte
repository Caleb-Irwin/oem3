<script lang="ts">
	import Deleted from './Deleted.svelte';
	import ItemLayout from './ItemLayout.svelte';
	import Text from './Text.svelte';
	import type { UnifiedProductRow } from './types';

	interface Props {
		row: UnifiedProductRow;
	}

	let { row }: Props = $props();
</script>

<ItemLayout
	tableName="UnifiedProduct"
	id={row.cells.id}
	lastUpdated={row.cells.lastUpdated}
	deleted={row.cells.deleted}
	primaryConnection={{ name: 'Guild Data', cell: row.cells.unifiedGuildRow }}
	secondaryConnection={{ name: 'SPR Data', cell: row.cells.unifiedSprRow }}
	otherConnections={[
		{ name: 'QuickBooks Data', cell: row.cells.qbRow },
		{ name: 'Shopify Data', cell: row.cells.shopifyRow }
	]}
	primaryIds={[
		{ name: 'Guild ID', cell: row.cells.gid },
		{ name: 'SPR Code', cell: row.cells.sprc },
		{ name: 'UPC', cell: row.cells.upc }
	]}
	otherIds={[
		{ name: 'Basics ID', cell: row.cells.basics },
		// { name: 'CWS ID', cell: row.cells.cws },
		{ name: 'CIS ID', cell: row.cells.cis },
		{ name: 'Etilize ID', cell: row.cells.etilizeId }
	]}
	title={row.cells.title}
	primaryImage={row.cells.primaryImage}
	primaryImageDescription={row.cells.primaryImageDescription}
	otherImages={row.cells.otherImagesJsonArr}
	price={row.cells.onlinePriceCents}
	comparePrice={row.cells.onlineComparePriceCents}
	thirdPrice={{ name: 'QuickBooks Price', cell: row.cells.quickBooksPriceCents }}
	description={row.cells.description}
	customStatus={status}
>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Guild Cost', cell: row.cells.guildCostCents }} price />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'SPR Cost', cell: row.cells.sprCostCents }} price />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Unit of Measure', cell: row.cells.um }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Quantity per Unit', cell: row.cells.qtyPerUm }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Category', cell: row.cells.category }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'In Flyer', cell: row.cells.inFlyer }} />
	</div>

	<div class="p-1 flex">
		<Text namedCell={{ name: 'Guild Inventory', cell: row.cells.guildInventory }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Local Inventory', cell: row.cells.localInventory }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'SPR Inventory Status', cell: row.cells.sprInventoryAvailability }} />
	</div>

	<div class="p-1 flex">
		<Text namedCell={{ name: 'Weight (grams)', cell: row.cells.weightGrams }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Vendor', cell: row.cells.vendor }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'CWS ID', cell: row.cells.cws }} />
	</div>
</ItemLayout>

{#snippet status()}
	<div class="pb-2 w-full grid lg:grid-cols-3 lg:gap-x-2 lg:gap-y-0 gap-y-2">
		<Text
			namedCell={{ name: 'Status', cell: row.cells.status }}
			class={row.cells.status.value === 'DISABLED'
				? 'variant-ghost-error'
				: row.cells.status.value === 'DISCONTINUED'
					? 'variant-ghost-warning'
					: ''}
		/>

		<Text
			namedCell={{ name: 'Available for Sale Online', cell: row.cells.availableForSaleOnline }}
			class={row.cells.availableForSaleOnline.value === false ? 'variant-ghost-error' : ''}
		/>
		<Text
			namedCell={{ name: 'Deleted', cell: row.cells.deleted }}
			class={row.cells.deleted.value === true ? 'variant-ghost-error' : ''}
		/>
	</div>
{/snippet}
