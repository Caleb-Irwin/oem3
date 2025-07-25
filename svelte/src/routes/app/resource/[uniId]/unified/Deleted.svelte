<script lang="ts">
	import type { Cell } from './types';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();
</script>

<div
	class="mt-2 md:mt-0 md:ml-2 card p-2 flex-shrink {cell.value
		? 'variant-ghost-error'
		: ''} flex flex-col items-center"
>
	<div class="w-full flex flex-row md:flex-col flex-grow items-center">
		<div class="md:flex-grow"></div>
		<p class="text-xl p-2 text-center">
			{@render valueRenderer(cell.value)}
		</p>
		<div class="flex-grow"></div>
		<SettingButton {cell} />
	</div>
	<Settings {cell} extraClass="text-normal" {valueRenderer} />
</div>

{#snippet valueRenderer(value: string | number | boolean | null)}
	<span class="font-bold {value ? 'text-error-600' : ''}">
		{value ? 'Item Deleted' : 'Item Active'}
	</span>
{/snippet}
