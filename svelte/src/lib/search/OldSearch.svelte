<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import { client } from '../client';
	import Form from '../Form.svelte';
	import { focusTrap, getModalStore } from '@skeletonlabs/skeleton';
	import SearchRes from './SearchRes.svelte';
	import { onMount, tick } from 'svelte';
	import type { QueryType } from '../../../../server/src/routers/search';
	import type { SelectFunc } from '$lib/ItemRow.svelte';

	interface Props {
		select?: undefined | SelectFunc;
		quickAdd?: boolean;
		quickAddQueryType?: QueryType;
		initQuery?: string;
		altRes?: (res: Awaited<ReturnType<typeof client.search.search.query>>) => void;
	}

	let {
		select = undefined,
		quickAdd = false,
		quickAddQueryType = 'all',
		initQuery,
		altRes
	}: Props = $props();

	const modalStore = getModalStore();
	let query: string | undefined = $state(initQuery),
		queryType: QueryType | undefined = $state(quickAdd ? quickAddQueryType : undefined),
		focus: boolean = $state(false);
	let formRef: any = undefined;
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

	onMount(async () => {
		if (initQuery && initQuery.trim().length > 0) {
			await tick();
			if (quickAdd) queryType = quickAddQueryType;
			formRef?.submit?.();
		}
	});
</script>

<Form
	bind:this={formRef}
	action={{ mutate: (input: object) => client.search.search.query(input as any) }}
	res={(res) => {
		if (altRes) return altRes(res);
		modalStore.trigger({
			type: 'component',
			response,
			component: {
				ref: SearchRes,
				props: {
					searchPages: [res],
					select,
					editSearchQuery: async (q: { query: string; queryType: QueryType }) => {
						modalStore.close();
						query = '';
						//@ts-ignore
						queryType = '';
						focus = false;
						await tick();
						query = q.query;
						focus = true;
					}
				}
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
				<select name="type" class="hidden" bind:value={quickAddQueryType}>
					<option value={quickAddQueryType}>QUERY TYPE</option>
				</select>
			{:else}
				<select name="type" bind:value={queryType}>
					<option value="all">All</option>
					<option value="unifiedGuild">Guild</option>
					<option value="unifiedSpr">SPR</option>
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
