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
	<div class="p-2">
		{@render valueRenderer(cell.value)}
	</div>
	<div class="flex p-2 items-center border-t-2 border-surface-200 dark:border-surface-500">
		<p class="text-lg font-bold flex-grow pl-1">Description</p>
		<SettingButton {cell} />
	</div>
	<Settings {cell} extraClass="p-2" {valueRenderer} />
</div>

{#snippet valueRenderer(value: string | number | boolean | null)}
	<p class="p-2 {value === null ? 'text-surface-400 dark:text-surface-200' : ''}">
		{@html value ? DOMPurify.sanitize(value as string) : 'Null'}
	</p>
{/snippet}
