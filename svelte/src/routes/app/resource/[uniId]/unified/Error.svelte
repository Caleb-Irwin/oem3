<script lang="ts">
	import type { Cell } from './types';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';

	interface Props {
		cell: Cell;
	}
	let { cell }: Props = $props();
</script>

{#if cell.activeErrors?.length > 0}
	<div>
		{#each cell.activeErrors as error}
			<div class="card variant-ghost-error p-2 m-0.5 text-sm">
				<div class="flex items-center">
					<span class="pr-2"><TriangleAlert /></span>
					<span>
						{error.confType.split(':')[1]}{error.message ? `: ${error.message}` : ''}
					</span>
				</div>
			</div>
		{/each}
	</div>
{/if}
