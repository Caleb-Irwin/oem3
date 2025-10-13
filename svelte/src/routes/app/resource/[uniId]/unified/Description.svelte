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
	<div class="flex p-2 pb-0 items-center">
		<p class="text-lg font-bold flex-grow pl-1">Description</p>
		<SettingButton {cell} />
	</div>
	<Settings {cell} extraClass="p-1" {valueRenderer} />
	<div class="p-2">
		{@render valueRenderer(cell.value)}
	</div>
</div>

{#snippet valueRenderer(value: string | number | boolean | null)}
	<p class="desc p-2 {value === null ? 'text-surface-400 dark:text-surface-200' : ''}">
		{@html value ? DOMPurify.sanitize(value as string) : 'Null'}
	</p>
{/snippet}

<style>
	.desc :global(span) {
		font-weight: 600;
	}
	.desc :global(ul) {
		padding-left: 1.25rem;
		list-style-type: disc;
	}
	.desc :global(li) {
		display: list-item;
		margin-left: 1.25rem;
		list-style-type: disc;
		list-style-position: outside;
	}
	.desc > :global(div) {
		padding-top: 1em;
	}
</style>
