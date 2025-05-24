<script lang="ts">
	import type { Cell } from './types';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();
</script>

<p>{cell.value} -- {JSON.stringify(cell)}</p>
