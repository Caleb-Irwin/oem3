<script lang="ts">
	import ItemLayout from './ItemLayout.svelte';
	import Text from './Text.svelte';
	import type { UnifiedSprRow } from './types';

	interface Props {
		row: UnifiedSprRow;
	}

	let { row }: Props = $props();
</script>

<ItemLayout
	tableName="UnifiedSpr"
	id={row.cells.id}
	lastUpdated={row.cells.lastUpdated}
	deleted={row.cells.deleted}
	primaryConnection={{ name: 'SPR Price File', cell: row.cells.sprPriceFileRow }}
	otherConnections={[{ name: 'SPR Flat File', cell: row.cells.sprFlatFileRow }]}
	primaryIds={[
		{ name: 'SPRC', cell: row.cells.sprc },
		{ name: 'UPC', cell: row.cells.upc }
	]}
	otherIds={[
		{ name: 'Etilize ID', cell: row.cells.etilizeId },
		{ name: 'CWS', cell: row.cells.cws },
		{ name: 'GTIN', cell: row.cells.gtin }
	]}
	title={row.cells.title}
	primaryImage={row.cells.primaryImage}
	primaryImageDescription={row.cells.primaryImageDescription}
	otherImages={row.cells.otherImagesJsonArr}
	price={row.cells.netPriceCents}
	description={row.cells.description}
>
	<div class="p-1 flex">
		<Text namedCell={{ name: 'Status', cell: row.cells.status }} />
	</div>

	<div class="p-1 flex">
		<Text namedCell={{ name: 'Dealer Net Price', cell: row.cells.dealerNetPriceCents }} price />
	</div>

	<div class="p-1 flex">
		<Text namedCell={{ name: 'Retail List Price', cell: row.cells.listPriceCents }} price />
	</div>

	<div class="p-1 flex">
		<Text namedCell={{ name: 'Unit of Measure', cell: row.cells.um }} />
	</div>

	<div class="p-1 flex">
		<Text namedCell={{ name: 'Category', cell: row.cells.category }} />
	</div>

	<div class="p-1 flex">
		<Text namedCell={{ name: 'Brand Name', cell: row.cells.brandName }} />
	</div>

	<div class="p-1 flex">
		<Text namedCell={{ name: 'Manufacturer Name', cell: row.cells.manufacturerName }} />
	</div>

	<div class="p-1 flex">
		<Text namedCell={{ name: 'Short Title', cell: row.cells.shortTitle }} />
	</div>

	<div class="p-1 flex col-span-1 md:col-span-2 lg:col-span-3">
		<Text namedCell={{ name: 'Keywords', cell: row.cells.keywords }} />
	</div>
</ItemLayout>
