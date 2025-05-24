<script lang="ts">
	import type { Cell } from './types';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();
</script>

<div class="card w-full">
	<h1 class="h1 p-2">{cell.value}</h1>
	<div class="flex p-2 items-center border-t-2 border-surface-200 dark:border-surface-500">
		<p class="text-lg font-bold flex-grow pl-1">Title</p>
		<SettingButton {cell} />
	</div>
	<Settings {cell} extraClass="p-2" />
</div>
