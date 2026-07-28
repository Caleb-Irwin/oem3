<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import type { QueryType } from '../../../../server/src/routers/search';

	let query = $state(''),
		loading = $state(false),
		input: HTMLInputElement | undefined = $state();

	const onSearchPage = $derived(page.url.pathname === '/app/search');
	const queryType: QueryType = $derived(
		onSearchPage ? ((page.url.searchParams.get('type') as QueryType) ?? 'all') : 'all'
	);

	afterNavigate(() => {
		loading = false;
		query = page.url.pathname === '/app/search' ? (page.url.searchParams.get('query') ?? '') : '';
	});

	function shortcut(e: KeyboardEvent) {
		const typingElsewhere =
			document.activeElement instanceof HTMLElement &&
			['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

		if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typingElsewhere)) {
			e.preventDefault();
			input?.focus();
			input?.select();
		} else if (e.key === 'Escape' && document.activeElement === input) {
			input?.blur();
		}
	}
</script>

<svelte:window onkeydown={shortcut} />

<form class="w-full max-w-xl" action="/app/search" onsubmit={() => (loading = true)}>
	<div
		class="input-group grid-cols-[auto_1fr_auto] h-10 items-center {loading
			? 'opacity-60'
			: ''} transition-opacity"
	>
		<div class="!pl-3 !pr-0 text-surface-400 dark:text-surface-300">
			<Search size={18} />
		</div>
		<input
			type="search"
			name="query"
			placeholder="Search items…"
			aria-label="Search items"
			autocomplete="off"
			class="!px-3 text-sm"
			bind:value={query}
			bind:this={input}
		/>
		<input type="hidden" name="type" value={queryType} />
		<kbd
			class="hidden md:flex !px-3 text-xs font-medium text-surface-400 dark:text-surface-300 select-none"
			aria-hidden="true"
		>
			⌘K
		</kbd>
	</div>
</form>
