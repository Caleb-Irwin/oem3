<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import { client } from '../client';
	import Form from '../Form.svelte';
	import { focusTrap, getModalStore } from '@skeletonlabs/skeleton';
	import SearchRes from './SearchRes.svelte';
	import { tick } from 'svelte';
	import type { QueryType } from '../../../../server/src/routers/search';

	interface Props {
		select?: undefined | ((selection: { uniref: number }) => any);
		quickAdd?: boolean;
		quickAddQueryType?: QueryType;
	}

	let { select = undefined, quickAdd = false, quickAddQueryType = 'all' }: Props = $props();

	const modalStore = getModalStore();
	let query: string | undefined = $state(),
		queryType: QueryType | undefined = $state(),
		focus: boolean = $state(false);
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
				props: { searchPages: [res], select }
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
	<div class="{quickAdd ? 'h-14' : 'h-20 my-3 p-1'} max-w-2xl form w-full flex">
		<div
			class="input-group input-group-divider grid-cols-[1fr_auto_auto] {quickAdd
				? '!variant-ghost-primary placeholder-primary-500 border-primary-500 '
				: ''}"
			use:focusTrap={focus}
		>
			<input
				type="text"
				placeholder={quickAdd ? 'Quick Add' : 'Search Query'}
				name="query"
				class={quickAdd ? 'placeholder-primary-700' : ''}
				bind:value={query}
			/>
			{#if quickAdd}
				<select name="type" class="hidden" bind:value={queryType}>
					<option value={quickAddQueryType}>QUERY TYPE</option>
				</select>
			{:else}
				<select name="type" bind:value={queryType}>
					<option value="all">All</option>
					<option value="unifiedGuild">Guild</option>
					<option value="qb">QB</option>
					<option value="shopify">Shopify</option>
					<option value="guildData">Guild Data</option>
					<option value="guildInventory">G. Inv.</option>
					<option value="guildFlyer">G. Flyer</option>
					<option value="sprPriceFile">SPR Price</option>
					<option value="sprFlatFile">SPR Info</option>
				</select>
			{/if}

			<button class="variant-filled-primary w-16">
				<Search />
			</button>
		</div>
	</div>
</Form>
