<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import CompactSearch from '$lib/search/CompactSearch.svelte';
	import ItemRow from '$lib/ItemRow.svelte';
	import { client } from '$lib/client';
	import Search from 'lucide-svelte/icons/search';
	import Suspense from '$lib/Suspense.svelte';
	import type { Cell } from './types';

	interface Props {
		cell: Cell;
		children?: import('svelte').Snippet;
	}

	let { cell, children }: Props = $props();

	let value = $state(cell.value);
	const modalStore = getModalStore(),
		getRawProduct = (res: any, key: string): any => {
			const obj: any = { uniId: res[key].uniref.uniId };
			obj[key] = res[key];
			return obj;
		},
		select = ({ id }: { id: number }) => {
			// value.set(id.toString());
		};
</script>

<div class="card flex flex-col">
	<div class="flex flex-row items-center p-1 px-2">
		<p class="font-semibold text-lg">{@render children?.()}</p>
		<div class="flex-grow"></div>
		<button
			class="btn btn-icon btn-icon-sm h-8 w-8 variant-ghost-secondary text-secondary-500"
			onclick={() =>
				modalStore.trigger({
					type: 'component',
					component: {
						ref: CompactSearch,
						props: { select, queryType: cell.col }
					}
				})}><Search /></button
		>
		<input type="text" class="input max-w-24 text-center ml-1 h-8" bind:value placeholder="null" />
	</div>
	{#if value}
		<ItemRow rawProduct={getRawProduct(value, cell.col + 'Data')} />
	{:else}
		<div class="h-full card grid place-content-center">
			<p class="text-center text-surface-400 py-2">Not Connected</p>
		</div>
	{/if}
</div>
