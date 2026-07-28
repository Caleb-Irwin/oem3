<script lang="ts">
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import { client, handleTRPCError } from '$lib/client';
	import SearchField from './SearchField.svelte';
	import SearchPage from './SearchPage.svelte';
	import { DEFAULT_QUERY_TYPE, queryTypeLabel } from './queryTypes';
	import type { QueryType } from '../../../../server/src/routers/search';

	interface Props {
		query?: string;
		queryType?: QueryType;
	}

	let { query: initialQuery = '', queryType: initialQueryType = DEFAULT_QUERY_TYPE }: Props =
		$props();

	let query = $state(initialQuery),
		queryType: QueryType = $state(initialQueryType),
		pages: Awaited<ReturnType<typeof client.search.search.query>>[] = $state([]),
		loading = $state(false),
		loadingMore = $state(false),
		error = $state('');

	const res = $derived(pages[0]);

	const fullSearchUrl = $derived(
		`/app/search?query=${encodeURIComponent(query)}&type=${queryType}`
	);

	async function search(event: SubmitEvent) {
		event.preventDefault();
		if (loading || query.trim() === '') return;
		loading = true;
		error = '';
		try {
			pages = [await client.search.search.query({ query, type: queryType, page: 0 })];
		} catch (cause) {
			error = 'Search failed. Please try again.';
			handleTRPCError(cause);
		} finally {
			loading = false;
		}
	}

	async function addPage(page: number) {
		const lastPage = pages[pages.length - 1];
		if (loadingMore || !lastPage?.more || page !== lastPage.page + 1) return;
		loadingMore = true;
		try {
			pages = [...pages, await client.search.search.query({ query, type: queryType, page })];
		} catch (cause) {
			error = 'More results could not be loaded.';
			handleTRPCError(cause);
		} finally {
			loadingMore = false;
		}
	}
</script>

<div class="card w-modal shadow-xl flex flex-col max-h-[80vh] overflow-hidden">
	<form class="p-3" onsubmit={search}>
		<SearchField bind:query bind:queryType {loading} autofocus />
	</form>

	<div class="flex-1 overflow-y-auto px-3">
		{#if error && pages.length === 0}
			<p class="py-10 text-center text-error-700 dark:text-error-400">{error}</p>
		{:else if res}
			{#if res.results.length === 0}
				<p class="py-10 text-center text-surface-400 dark:text-surface-300">
					No results for “{res.query}”.
				</p>
			{:else}
				{#each pages as page (page.page)}
					<SearchPage
						res={page}
						grid={false}
						all={page.queryType === 'all'}
						select={undefined}
						{addPage}
					/>
				{/each}
				{#if error}
					<p class="py-3 text-center text-sm text-error-700 dark:text-error-400">{error}</p>
				{/if}
			{/if}
		{:else}
			<p class="py-10 text-center text-surface-400 dark:text-surface-300">
				{#if loading}
					Searching…
				{:else}
					Press <kbd class="kbd">Enter</kbd> to search.
				{/if}
			</p>
		{/if}
	</div>

	<footer
		class="flex items-center justify-between gap-3 border-t border-surface-300/60 dark:border-surface-700 px-4 py-2 text-sm"
	>
		<span class="text-surface-400 dark:text-surface-300">
			{#if res}
				{@const latest = pages[pages.length - 1]}
				{latest.count}{latest.more ? '+' : ''} result{latest.count === 1 ? '' : 's'}
			{:else}
				Searching {queryTypeLabel(queryType)}
			{/if}
		</span>
		<a
			href={fullSearchUrl}
			class="flex items-center gap-1 font-medium text-primary-700 hover:underline dark:text-primary-400"
		>
			Open full search <ArrowRight size={16} />
		</a>
	</footer>
</div>
