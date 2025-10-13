<script lang="ts">
	import ItemRow from '$lib/ItemRow.svelte';
	import SettingButton from './SettingButton.svelte';
	import Settings from './Settings.svelte';
	import { ColToTableName, type NamedCell } from './types';
	import ConnectionValRenderer from './ConnectionValRenderer.svelte';
	import SmartAddConnection from './SmartAddConnection.svelte';

	interface Props {
		namedCell: NamedCell;
		keyIds: string;
	}

	let { namedCell, keyIds }: Props = $props();
	let cell = $derived(namedCell.cell),
		name = $derived(namedCell.name);
</script>

<div class="card w-full flex flex-col min-w-72">
	<div class="flex p-2 pb-0 items-center">
		<p class="text-lg font-bold flex-grow pl-1">{name}</p>
		<SettingButton {cell} />
	</div>

	<div class="flex flex-col w-full">
		<Settings {cell} extraClass="p-1" {valueRenderer} />
	</div>

	<div
		class="flex-grow flex flex-col items-center justify-center {cell.connectionRow ? '' : 'p-1'}"
	>
		{#if cell.connectionRow}
			<ItemRow
				rawProduct={cell.connectionRow as any}
				replaceClass="max-w-none w-full h-full p-2 flex justify-center items-center flex-row flex-wrap"
			/>
		{:else}
			<p class="text-lg font-semibold p-2 w-full text-center">No Connection</p>
			{#key keyIds}
				<SmartAddConnection
					baseSearch={keyIds}
					tableName={ColToTableName[cell.col as keyof typeof ColToTableName]}
					expanded={cell.activeErrors.some(
						(error: (typeof cell.activeErrors)[number]) =>
							error.confType === 'error:shouldNotBeNull'
					)}
					cell={namedCell.cell}
				/>
			{/key}
		{/if}
	</div>
</div>

{#snippet valueRenderer(value: string | number | boolean | null)}
	<div class="flex-grow flex items-center card min-h-[75px]">
		{#if value?.toString().toLocaleLowerCase() === 'null' || value === null}
			<p class="text-lg font-semibold p-2 w-full text-center">No Connection</p>
		{:else if isNaN(parseInt(value as any))}
			<p class="text-lg font-semibold p-2 w-full text-center">Invalid Number</p>
		{:else}
			{#key value}
				<ConnectionValRenderer
					value={parseInt(value as any)}
					col={cell.col}
					init={cell.value === parseInt(value as any) ? cell.connectionRow : undefined}
				/>
			{/key}
		{/if}
	</div>
{/snippet}
