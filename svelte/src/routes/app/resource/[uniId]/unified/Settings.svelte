<script lang="ts" module>
	const openSettings = $state<{ [compoundId: string]: { [col: string]: boolean } }>({});

	export function toggleSettings(compoundId: string, col: string) {
		if (!openSettings[compoundId]) {
			openSettings[compoundId] = {};
		}
		openSettings[compoundId][col] = !openSettings[compoundId][col];
	}
</script>

<script lang="ts">
	import type { Cell } from './types';

	interface Props {
		cell: Cell;
		extraClass?: string;
	}
	let { cell, extraClass }: Props = $props();
</script>

{#if openSettings[cell.compoundId]?.[cell.col]}
	<div class="flex items-center w-full min-h-16 place-content-center min-w-52 {extraClass ?? ''}">
		<p>{cell.col} Settings</p>
	</div>
{/if}
