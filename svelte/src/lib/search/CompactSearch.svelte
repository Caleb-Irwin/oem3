<script lang="ts">
	import { client } from '$lib/client';
	import Form from '$lib/Form.svelte';
	import type { QueryType } from '../../../../server/src/routers/search';
	import type { SelectFunc } from '$lib/ItemRow.svelte';
	import SearchField from './SearchField.svelte';
	import SearchRes from './SearchRes.svelte';

	interface Props {
		select?: SelectFunc;
		queryType: QueryType;
	}

	let { select = undefined, queryType = $bindable() }: Props = $props();

	let query = $state(''),
		searchPages: Awaited<ReturnType<typeof client.search.search.query>>[] = $state([]);
</script>

<div class="card flex max-h-[85vh] w-[min(92vw,64rem)] flex-col overflow-hidden shadow-xl">
	<Form
		action={{ mutate: client.search.search.query }}
		res={(res) => {
			searchPages = [res];
		}}
		class="mx-auto w-full max-w-3xl shrink-0 p-4"
		noReset
	>
		<SearchField
			size="lg"
			bind:query
			bind:queryType
			queryTypes={[queryType]}
			placeholder="Find a new match…"
			autofocus
		/>
	</Form>

	{#if searchPages.length > 0}
		<div class="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
			<SearchRes
				bind:searchPages
				{select}
				fullHeight
				editSearchQuery={(next) => {
					query = next.query;
				}}
			/>
		</div>
	{:else}
		<p class="px-4 pb-6 text-center text-sm text-surface-400 dark:text-surface-300">
			Search for an item to create a new match.
		</p>
	{/if}
</div>
