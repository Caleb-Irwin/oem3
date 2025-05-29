<script lang="ts">
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';
	import type { Cell } from './types';
	import DOMPurify from 'isomorphic-dompurify';

	interface Props {
		cell: Cell;
	}

	let { cell }: Props = $props();
</script>

<div class="card">
	<p class="p-4 {cell.value === null ? 'text-surface-400 dark:text-surface-200' : ''}">
		{@html cell.value ? DOMPurify.sanitize(cell.value as string) : 'Null'}
	</p>
	<div class="flex p-2 items-center border-t-2 border-surface-200 dark:border-surface-500">
		<p class="text-lg font-bold flex-grow pl-1">Description</p>
		<SettingButton {cell} />
	</div>
	<Settings {cell} extraClass="p-2" />
</div>
