<script lang="ts">
	import ItemLayout from './ItemLayout.svelte';
	import type { UnifiedGuildRow } from './types';

	interface Props {
		row: UnifiedGuildRow;
	}

	let { row }: Props = $props();
</script>

<ItemLayout
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
	otherImages={row.cells.otherImageListJSON}
	price={row.cells.priceCents}
	comparePrice={row.cells.comparePriceCents}
	description={row.cells.description}
/>
