<script lang="ts">
	import type { Cell } from './types';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();
</script>

<div class="card flex-grow p-1">
	<div class="flex items-center">
		<div class="flex-grow">
			{@render valueRenderer(cell.value)}
		</div>
		<div class="flex flex-col p-1 items-center justify-center">
			<SettingButton {cell} />
			<!-- <p class="text-lg font-bold flex-grow pt-1">Title</p> -->
		</div>
	</div>

	<Settings {cell} extraClass="p-0" {valueRenderer} />
</div>

{#snippet valueRenderer(value: string | number | boolean | null)}
	<h1 class="h1 p-2">{value}</h1>
{/snippet}
