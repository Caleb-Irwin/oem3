<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import { getModalStore } from '@skeletonlabs/skeleton';
	import { page } from '$app/state';
	import SearchModal from './SearchModal.svelte';
	import { DEFAULT_QUERY_TYPE, isQueryType } from './queryTypes';

	const modalStore = getModalStore();

	/** Carries the search page's current query and filter into the modal. */
	function openSearch() {
		if ($modalStore.length > 0) return;
		const type = page.url.searchParams.get('type'),
			onSearchPage = page.url.pathname === '/app/search';
		modalStore.trigger({
			type: 'component',
			component: {
				ref: SearchModal,
				props: {
					query: onSearchPage ? (page.url.searchParams.get('query') ?? '') : '',
					queryType: onSearchPage && isQueryType(type) ? type : DEFAULT_QUERY_TYPE
				}
			}
		});
	}

	function shortcut(e: KeyboardEvent) {
		const typingElsewhere =
			document.activeElement instanceof HTMLElement &&
			['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

		if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typingElsewhere)) {
			e.preventDefault();
			openSearch();
		}
	}
</script>

<svelte:window onkeydown={shortcut} />

<button
	type="button"
	onclick={openSearch}
	aria-label="Search items"
	class="btn btn-sm btn-icon btn-icon-sm text-surface-400 hover:variant-soft-surface dark:text-surface-300 sm:hidden"
>
	<Search size={16} class="text-surface-400 dark:text-surface-300" />
</button>

<button
	type="button"
	onclick={openSearch}
	aria-label="Search items"
	class="btn btn-sm hidden h-9 gap-2 rounded-full border border-surface-300 bg-surface-100 px-3 text-surface-400 transition-colors hover:border-primary-500 dark:border-surface-400/30 dark:bg-surface-700 dark:text-surface-300 sm:flex"
>
	<Search size={16} />
	<span class="text-sm">Search</span>
	<kbd
		class="hidden text-xs font-medium text-surface-400 dark:text-surface-300 md:inline"
		aria-hidden="true">⌘K</kbd
	>
</button>
