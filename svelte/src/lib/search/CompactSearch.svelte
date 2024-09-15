<script lang="ts">
	import { client } from '$lib/client';
	import Form from '$lib/Form.svelte';
	import type { QueryType } from '../../../../server/src/routers/search';
	import Search from 'lucide-svelte/icons/search';
	import SearchRes from './SearchRes.svelte';
	import { tick } from 'svelte';
	import { focusTrap } from '@skeletonlabs/skeleton';
	import type { SelectFunc } from '$lib/ItemRow.svelte';

	export let select: SelectFunc, queryType: QueryType;

	let query = '',
		searchRes: any,
		focus: boolean = false;
</script>

<div class="card min-w-80 max-h-[90vh] overflow-scroll">
	<Form
		action={{ mutate: client.search.search.query }}
		res={(res) => {
			searchRes = res;
		}}
		class="w-full"
		center
	>
		<div class="h-16 my-3 p-1 max-w-2xl form w-full flex">
			<div class="input-group input-group-divider grid-cols-[1fr_auto]" use:focusTrap={focus}>
				<input type="text" placeholder="Search Query" name="query" bind:value={query} />
				<select name="type" class="hidden" bind:value={queryType}>
					<option value={queryType}>QB</option>
				</select>

				<button class="variant-filled-primary w-16">
					<Search />
				</button>
			</div>
		</div>
	</Form>
	{#if searchRes}
		{#key searchRes}
			<SearchRes
				res={searchRes}
				{select}
				editSearchQuery={async (q) => {
					query = '';
					//@ts-ignore
					queryType = '';
					focus = false;
					await tick();
					query = q.query;
					queryType = q.queryType;
					focus = true;
				}}
			/>
		{/key}
	{/if}
</div>
