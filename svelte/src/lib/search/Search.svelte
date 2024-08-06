<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import { client } from '../client';
	import Form from '../Form.svelte';
	import { focusTrap, getModalStore } from '@skeletonlabs/skeleton';
	import SearchRes from './SearchRes.svelte';
	import { tick } from 'svelte';
	import type { QueryType } from '../../../../server/src/routers/search';

	export let select: undefined | ((selection: { uniref: number }) => any) = undefined,
		microQB = false;

	const modalStore = getModalStore();
	let query: string,
		queryType: QueryType,
		focus: boolean = false;
	const response = async (prev: { query: string; queryType: typeof queryType }) => {
		if (prev === undefined) return;
		query = '';
		queryType = '' as typeof queryType;
		await tick();
		query = prev.query;
		queryType = prev.queryType;
		focus = true;
		await tick();
		focus = false;
	};
</script>

<Form
	action={{ mutate: client.search.search.query }}
	res={(res) => {
		modalStore.trigger({
			type: 'component',
			response,
			component: {
				ref: SearchRes,
				props: { res, select }
			}
		});
		tick().then(async () => {
			const prevQueryType = queryType;
			//@ts-ignore
			queryType = '';
			await tick();
			queryType = prevQueryType;
		});
	}}
	class="w-full"
	center
>
	<div class="{microQB ? 'h-14' : 'h-20 my-3 p-1'} max-w-2xl form w-full flex">
		<div
			class="input-group input-group-divider grid-cols-[1fr_auto_auto] {microQB
				? '!variant-ghost-primary placeholder-primary-500 '
				: ''}"
			use:focusTrap={focus}
		>
			<input
				type="text"
				placeholder={microQB ? 'Quick Add' : 'Search Query'}
				name="query"
				class={microQB ? 'placeholder-primary-700' : ''}
				bind:value={query}
			/>
			{#if microQB}
				<select name="type" class="hidden" bind:value={queryType}>
					<option value="qb">QB</option>
				</select>
			{:else}
				<select name="type" bind:value={queryType}>
					<option value="all">All</option>
					<option value="qb">QB</option>
					<option value="guild">Guild</option>
					<option value="guildInventory">Gld Inv</option>
					<option value="shopify" disabled>Shopify</option>
					<option value="spr" disabled>SPR</option>
				</select>
			{/if}

			<button class="variant-filled-primary w-16">
				<Search />
			</button>
		</div>
	</div>
</Form>
