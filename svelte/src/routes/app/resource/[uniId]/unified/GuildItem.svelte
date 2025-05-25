<script lang="ts">
	import ItemLayout from './ItemLayout.svelte';
	import Text from './Text.svelte';
	import type { UnifiedGuildRow } from './types';

	interface Props {
		row: UnifiedGuildRow;
	}

	let { row }: Props = $props();
</script>

<ItemLayout
	tableName="UnifiedGuild"
	id={row.cells.id}
	lastUpdated={row.cells.lastUpdated}
	deleted={row.cells.deleted}
	primaryConnection={{ name: 'Guild Data', cell: row.cells.dataRow }}
	otherConnections={[
		{ name: 'Guild Inventory', cell: row.cells.inventoryRow },
		{ name: 'Guild Flyer', cell: row.cells.flyerRow }
	]}
	primaryIds={[
		{ name: 'Guild ID', cell: row.cells.gid },
		{ name: 'UPC', cell: row.cells.upc }
	]}
	otherIds={[
		{ name: 'SPR ID', cell: row.cells.spr },
		{ name: 'Basics ID', cell: row.cells.basics },
		{ name: 'CIS ID', cell: row.cells.cis }
	]}
	title={row.cells.title}
	primaryImage={row.cells.imageUrl}
	primaryImageDescription={row.cells.primaryImageDescription}
	otherImages={row.cells.otherImageListJSON}
	price={row.cells.priceCents}
	comparePrice={row.cells.comparePriceCents}
	description={row.cells.description}
>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Inventory', cell: row.cells.inventory }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Cost', cell: row.cells.costCents }} price />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Unit of Measure', cell: row.cells.um }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Unit of Measure Quantity', cell: row.cells.qtyPerUm }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Master Pack Quantity', cell: row.cells.masterPackQty }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Vendor', cell: row.cells.vendor }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Freight Flag', cell: row.cells.freightFlag }} />
	</div>
	<div class="p-1 flex">
		<Text
			namedCell={{ name: 'Heavy Goods Charge SK', cell: row.cells.heavyGoodsChargeSkCents }}
			price
		/>
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Weight Grams', cell: row.cells.weightGrams }} />
	</div>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Category', cell: row.cells.category }} />
	</div>
</ItemLayout>
