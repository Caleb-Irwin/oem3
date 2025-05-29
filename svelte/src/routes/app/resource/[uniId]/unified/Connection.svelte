<script lang="ts">
	import ItemRow from '$lib/ItemRow.svelte';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';
	import type { NamedCell } from './types';

	interface Props {
		namedCell: NamedCell;
	}

	let { namedCell }: Props = $props();
	let cell = $derived(namedCell.cell),
		name = $derived(namedCell.name);
</script>

<div class="card w-full flex flex-col min-w-72">
	<div class="flex-grow flex items-center {cell.connectionRow ? '' : 'card'}">
		{#if cell.connectionRow}
			<ItemRow rawProduct={cell.connectionRow as any} newTab />
		{:else}
			<p class="text-lg font-semibold p-2 w-full text-center">No Connection</p>
		{/if}
	</div>
	<div class="flex p-2 items-center border-t-2 border-surface-200 dark:border-surface-500">
		<p class="text-lg font-bold flex-grow pl-1">{name}</p>
		<SettingButton {cell} />
	</div>
	<Settings {cell} extraClass="p-2" />
</div>
