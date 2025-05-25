<script lang="ts">
	import ItemRow from '$lib/ItemRow.svelte';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';
	import type { NamedCell } from './types';

	interface Props {
		namedCell: NamedCell;
	}

	let { namedCell }: Props = $props();
	let cell = $state(namedCell.cell),
		name = $state(namedCell.name);
</script>

<div class="card w-full flex flex-col min-w-72">
	{#if cell.connectionRow}
		<ItemRow rawProduct={cell.connectionRow as any} newTab />
	{:else}
		<div class="card text-lg font-semibold text-center p-2 grid place-content-center flex-grow">
			<p>No Connection</p>
		</div>
	{/if}
	<div class="flex p-2 items-center border-t-2 border-surface-200 dark:border-surface-500">
		<p class="text-lg font-bold flex-grow pl-1">{name}</p>
		<SettingButton {cell} />
	</div>
	<Settings {cell} extraClass="p-2" />
</div>
