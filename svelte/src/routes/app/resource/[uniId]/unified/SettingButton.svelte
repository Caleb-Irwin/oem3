<script lang="ts">
	import Settings from 'lucide-svelte/icons/settings';
	import type { Cell } from './types';
	import { toggleSettings } from './Settings.svelte';

	interface Props {
		cell: Cell;
	}
	let { cell }: Props = $props();
</script>

<button class="btn-icon variant-soft" onclick={() => toggleSettings(cell.compoundId, cell.col)}>
	<Settings />
</button>
