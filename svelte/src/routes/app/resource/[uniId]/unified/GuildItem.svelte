<script lang="ts">
	import ItemLayout from './ItemLayout.svelte';
	import type { UnifiedGuildRow } from './types';

	interface Props {
		row: UnifiedGuildRow;
	}

	let { row }: Props = $props();
</script>

<ItemLayout
	title={row.cells.title}
	primaryImage={row.cells.imageUrl}
	otherImages={row.cells.otherImageListJSON}
	price={row.cells.priceCents}
	comparePrice={row.cells.comparePriceCents}
	description={row.cells.description}
/>
