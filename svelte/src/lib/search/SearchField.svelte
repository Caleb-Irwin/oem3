<script lang="ts">
	import Search from 'lucide-svelte/icons/search';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import { DEFAULT_QUERY_TYPE, queryTypeOptions } from './queryTypes';
	import type { QueryType } from '../../../../server/src/routers/search';

	interface Props {
		query?: string;
		queryType?: QueryType;
		/** `lg` is the page-level field, `sm` fits inside the search modal. */
		size?: 'sm' | 'lg';
		placeholder?: string;
		autofocus?: boolean;
		loading?: boolean;
		/** Allowed scopes. A single scope is submitted silently instead of showing a selector. */
		queryTypes?: QueryType[];
	}

	let {
		query = $bindable(''),
		queryType = $bindable(DEFAULT_QUERY_TYPE),
		size = 'sm',
		placeholder = 'Search items…',
		autofocus = false,
		loading = false,
		queryTypes = queryTypeOptions.map((option) => option.value)
	}: Props = $props();

	const large = $derived(size === 'lg');
	const availableOptions = $derived(
		queryTypeOptions.filter((option) => queryTypes.includes(option.value))
	);
	const showTypeSelect = $derived(availableOptions.length > 1);

	// The pill shows focus for the whole field, so the controls inside suppress their
	// own outline — `!` beats the global :focus-visible ring in app.postcss.
	const controlReset =
		'border-0 bg-transparent bg-none outline-none focus:outline-none focus:!outline-none focus:ring-0';
</script>

<div class="flex w-full flex-col gap-2">
	<div
		class="relative flex w-full items-stretch rounded-full border border-surface-300 bg-surface-100 shadow-sm transition-colors focus-within:border-primary-500 dark:border-surface-400/40 dark:bg-surface-700 {large
			? 'h-14 pr-2'
			: 'h-11 pr-1.5'}"
	>
		<Search
			class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-300 {large
				? 'left-5'
				: 'left-4'}"
			size={large ? 20 : 18}
			aria-hidden="true"
		/>

		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			name="query"
			{placeholder}
			{autofocus}
			aria-label="Search query"
			autocomplete="off"
			class="h-full min-w-0 flex-1 rounded-l-full p-0 pr-3 placeholder:text-surface-400 dark:placeholder:text-surface-300 {controlReset} {large
				? 'pl-14 text-lg'
				: 'pl-11 text-sm'}"
			bind:value={query}
		/>

		{#if showTypeSelect}
			<div class="my-3 hidden w-px shrink-0 bg-surface-300 dark:bg-surface-400/40 sm:block"></div>
			<label class="relative hidden shrink-0 items-stretch sm:flex">
				<span class="sr-only">Item type</span>
				<select
					name="type"
					bind:value={queryType}
					class="h-full cursor-pointer appearance-none truncate py-0 pl-3 pr-7 text-sm font-medium {controlReset}"
				>
					{#each availableOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<ChevronDown
					size={16}
					class="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-300"
				/>
			</label>
		{:else}
			<input type="hidden" name="type" value={queryType} />
		{/if}

		<button
			type="submit"
			class="btn my-1.5 shrink-0 variant-ghost-primary {large ? 'ml-2 px-6' : 'ml-1.5 px-4'}"
			aria-label="Search"
			disabled={loading}
		>
			{#if loading}
				<LoaderCircle size={large ? 20 : 16} class="animate-spin" />
			{:else}
				<Search size={large ? 20 : 16} />
			{/if}
			{#if large}
				<span class="ml-2 hidden sm:inline">Search</span>
			{/if}
		</button>
	</div>

	{#if showTypeSelect}
		<label class="relative flex h-10 items-stretch sm:hidden">
			<span class="sr-only">Item type</span>
			<select
				name="type"
				bind:value={queryType}
				class="select h-full w-full cursor-pointer appearance-none bg-none py-0 pl-3 pr-9 text-sm font-medium"
			>
				{#each availableOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			<ChevronDown
				size={16}
				class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-300"
			/>
		</label>
	{/if}
</div>
