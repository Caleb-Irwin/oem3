<script lang="ts">
	import { browser } from '$app/environment';
	import RotateCw from 'lucide-svelte/icons/rotate-cw';
	import BadgeDollarSign from 'lucide-svelte/icons/badge-dollar-sign';
	import Button from '$lib/Button.svelte';
	import { client, subVal } from '$lib/client';
	import ExportsPanel from './ExportsPanel.svelte';
	import Workspace from './Workspace.svelte';
	import {
		CATEGORIES,
		parseReviewHash,
		reviewHash,
		type PriceChangeCategory,
		type PriceChangeView
	} from './types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The scope and screen live in the hash so a refresh or shared link reopens them.
	const initial = browser
		? parseReviewHash(location.hash)
		: { category: 'all' as const, view: 'review' as const };

	let category = $state<PriceChangeCategory>(initial.category);
	let view = $state<PriceChangeView>(initial.view);

	function setCategory(value: PriceChangeCategory) {
		category = value;
		syncHash();
	}

	function setView(value: PriceChangeView) {
		view = value;
		syncHash();
	}

	function syncHash() {
		if (!browser) return;
		const hash = reviewHash(category, view);
		if (location.hash !== hash) history.replaceState(null, '', hash);
	}

	function applyHash() {
		const parsed = parseReviewHash(location.hash);
		category = parsed.category;
		view = parsed.view;
	}

	const workerStatus = subVal(client.priceChanges.worker.statusSub, { init: undefined });
	const dateFormat = new Intl.DateTimeFormat('en-CA', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
	let computedAt = $state(data.priceChanges.summary.computedAt);
	let categorySummary = $state(data.priceChanges.summary);
	const currentCategory = $derived(
		CATEGORIES.find((option) => option.value === category) ?? CATEGORIES[3]
	);
</script>

<svelte:head>
	<title>OEM3 Price Changes</title>
</svelte:head>

<svelte:window onhashchange={applyHash} />

<div class="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
	<header class="card overflow-hidden p-0">
		<div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
			<div class="flex min-w-0 items-center gap-3">
				<div
					class="grid h-11 w-11 shrink-0 place-content-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300"
				>
					<BadgeDollarSign size={24} />
				</div>
				<div class="min-w-0">
					<h1 class="h3">Price Changes</h1>
					<p class="mt-0.5 text-sm text-surface-600 dark:text-surface-300">
						Review QuickBooks prices, then send the approved changes to a shelf tag sheet.
					</p>
				</div>
			</div>

			<div class="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
				<span class="text-xs text-surface-500 dark:text-surface-400 sm:text-sm">
					{$workerStatus?.running
						? 'Recalculating…'
						: computedAt
							? `Updated ${dateFormat.format(computedAt)}`
							: 'Not calculated yet'}
				</span>
				<Button
					class="btn btn-sm variant-ghost"
					action={client.priceChanges.worker.run}
					input={{}}
					disabled={$workerStatus?.running ?? false}
				>
					<RotateCw size={16} /><span class="pl-1">Recalculate</span>
				</Button>
			</div>
		</div>

		<div
			class="border-t border-surface-200 bg-surface-50/70 p-3 dark:border-surface-700 dark:bg-surface-800/40 sm:flex sm:items-center sm:justify-between sm:gap-4"
		>
			<div class="mb-2 min-w-0 sm:mb-0">
				<p
					class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400"
				>
					Queue scope
				</p>
				<p class="truncate text-sm text-surface-700 dark:text-surface-200">
					{currentCategory.hint}
				</p>
			</div>
			<nav
				class="grid grid-cols-2 gap-1 rounded-lg bg-surface-200 p-1 dark:bg-surface-700 sm:flex sm:shrink-0"
				aria-label="Price change queue scope"
			>
				{#each CATEGORIES as option}
					<button
						class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {category ===
						option.value
							? 'bg-surface-50 text-surface-900 shadow-sm dark:bg-surface-800 dark:text-surface-50'
							: 'text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-surface-50'}"
						title={option.hint}
						aria-pressed={category === option.value}
						onclick={() => setCategory(option.value)}
					>
						<span>{option.label}</span>
						<span
							class="ml-1.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums {category ===
							option.value
								? 'bg-surface-200 dark:bg-surface-700'
								: 'bg-surface-300/70 dark:bg-surface-800'}"
						>
							{categorySummary.scopeCounts[option.value]}
						</span>
					</button>
				{/each}
			</nav>
		</div>
	</header>

	{#key category}
		<Workspace
			{category}
			{view}
			init={category === 'all' ? data.priceChanges : undefined}
			onViewChange={setView}
			onComputedAt={(value) => (computedAt = value)}
			onSummary={(value) => (categorySummary = value)}
		/>
	{/key}

	<ExportsPanel init={data.exports} />
</div>
