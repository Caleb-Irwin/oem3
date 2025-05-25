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
		<p class="text-xl font-bold p-2 text-center {cell.value ? 'text-error-600' : ''}">
			{cell.value ? 'Item Deleted' : 'Item Active'}
		</p>
		<div class="flex-grow"></div>
		<SettingButton {cell} />
	</div>
	<Settings {cell} extraClass="p-2 text-normal" />
</div>
