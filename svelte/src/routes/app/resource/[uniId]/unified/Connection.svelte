<script lang="ts">
	import { client } from '$lib/client';
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

	let promiseCache = new Map<string, { promise: Promise<any> | null; timestamp: number }>();

	function getConnectionRowPromise(value: string | number | boolean | null) {
		if (value === null || value === undefined) return null;

		const parsedValue = parseInt(value as any);
		if (isNaN(parsedValue)) return null;

		const cacheKey = `${cell.col}-${parsedValue}`;
		const now = Date.now();

		const cached = promiseCache.get(cacheKey);
		if (cached && now - cached.timestamp < 30 * 1000) {
			return cached.promise;
		}

		const promise = client.unified.getResourceByCol.query({
			col: cell.col as any,
			value: parsedValue
		});

		promiseCache.set(cacheKey, {
			promise,
			timestamp: now
		});

		return promise;
	}
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
	<Settings {cell} extraClass="p-2 pt-0" {valueRenderer} />
</div>

{#snippet valueRenderer(value: string | number | boolean | null)}
	{@const connectionRowPromise = getConnectionRowPromise(value)}
	<div class="flex-grow flex items-center card min-h-[75px]">
		{#await connectionRowPromise}
			<p class="font-semibold p-2 w-full text-center animate-pulse">Loading Preview...</p>
		{:then connectionRow}
			{#if connectionRow}
				<ItemRow rawProduct={connectionRow as any} newTab />
			{:else}
				<p class="text-lg font-semibold p-2 w-full text-center">
					No Connection
					{JSON.stringify(value)}
				</p>
			{/if}
		{:catch error}
			<p class="text-lg font-semibold p-2 w-full text-center text-error-600">
				Error loading connection ({error.message})
			</p>
		{/await}
	</div>
{/snippet}
