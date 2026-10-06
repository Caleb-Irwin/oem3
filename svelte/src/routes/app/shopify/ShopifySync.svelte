<script lang="ts">
	import Button from '$lib/Button.svelte';
	import { client, subVal } from '$lib/client';
	import WorkerStatus from '$lib/WorkerStatus.svelte';
	import RotateCw from 'lucide-svelte/icons/rotate-cw';
	import ArrowUpFromLine from 'lucide-svelte/icons/arrow-up-from-line';
	import ArrowDownToLine from 'lucide-svelte/icons/arrow-down-to-line';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import CircleX from 'lucide-svelte/icons/circle-x';
	import CirclePause from 'lucide-svelte/icons/circle-pause';
	import Hourglass from 'lucide-svelte/icons/hourglass';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import { onMount } from 'svelte';
	import type { ShopifySyncOverview } from '../../../../../server/src/routers/shopify/push';

	interface Props {
		initOverview: ShopifySyncOverview;
		isAdmin: boolean;
	}

	let { initOverview, isAdmin }: Props = $props();

	const PAGE = 10,
		// The most the server returns
		MAX_HISTORY = 200;
	let historyLimit = $state(PAGE);

	// Re-subscribes with the new limit when more history is shown
	let overviewStore = $derived(
		subVal(client.shopify.pushSync.overviewSub, {
			input: { historyLimit },
			init: historyLimit === PAGE ? initOverview : undefined
		})
	);
	// Keeps showing the previous overview while a new subscription starts
	let lastOverview: ShopifySyncOverview | undefined = $state();
	$effect(() => {
		if ($overviewStore) lastOverview = $overviewStore;
	});
	const overview = $derived($overviewStore ?? lastOverview ?? initOverview);

	const workerStatus = subVal(client.shopify.pushSync.worker.statusSub, { init: undefined });

	let now = $state(Date.now());
	onMount(() => {
		const interval = setInterval(() => (now = Date.now()), 30 * 1000);
		return () => clearInterval(interval);
	});

	const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
	function ago(time: number | null | undefined) {
		if (!time) return 'never';
		const seconds = Math.round((time - now) / 1000);
		if (Math.abs(seconds) < 60) return 'just now';
		const minutes = Math.round(seconds / 60);
		if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
		const hours = Math.round(minutes / 60);
		if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
		return relative.format(Math.round(hours / 24), 'day');
	}

	function duration(start: number, end: number | null) {
		if (!end) return null;
		const seconds = Math.round((end - start) / 1000);
		if (seconds < 60) return `${seconds}s`;
		return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
	}

	const n = (value: number | undefined) => (value ?? 0).toLocaleString();

	const skipLabels: Record<string, string> = {
		unchanged: 'Unchanged since last push',
		sameHash: 'Same content as last push',
		notSynced: 'Waiting for the Shopify pull',
		failing: 'Failing until the product changes'
	};
	const holdLabels: Record<string, string> = {
		deleted: 'Deleted',
		discontinued: 'Discontinued',
		duplicate: 'Duplicate',
		noEtilizeContent: 'No Etilize content'
	};

	type Push = ShopifySyncOverview['pushes'][number];
	type Pull = ShopifySyncOverview['pulls'][number];
	type Activity =
		{ kind: 'push'; at: number; push: Push } | { kind: 'pull'; at: number; pull: Pull };

	const activity = $derived(
		[
			...overview.pushes.map((push): Activity => ({ kind: 'push', at: push.startedAt, push })),
			...overview.pulls.map((pull): Activity => ({ kind: 'pull', at: pull.created, pull }))
		]
			.sort((a, b) => b.at - a.at)
			.slice(0, historyLimit)
	);
	const hasMore = $derived(
		historyLimit < MAX_HISTORY &&
			(overview.pushes.length >= historyLimit || overview.pulls.length >= historyLimit)
	);

	const live = $derived(overview.listings.byStatus.ACTIVE ?? 0);
	const linkedShare = $derived(
		overview.listings.products > 0 ? overview.listings.linked / overview.listings.products : 0
	);
	const lastPull = $derived(overview.pulls[0]);
	const lastPullChanges = $derived(
		lastPull
			? (lastPull.summary.create ?? 0) +
					(lastPull.summary.update ?? 0) +
					(lastPull.summary.inventoryUpdate ?? 0) +
					(lastPull.summary.delete ?? 0)
			: 0
	);

	const pushChips = (push: Push) =>
		[
			{ label: 'created', value: push.created },
			{ label: 'updated', value: push.updated },
			{ label: 'failed', value: push.failed, error: true },
			{ label: 'archived', value: push.archived },
			{ label: 'recovered', value: push.recovered }
		].filter((chip) => chip.value > 0);

	const pullChips = (pull: Pull) =>
		[
			{ label: 'created', value: pull.summary.create ?? 0 },
			{ label: 'updated', value: pull.summary.update ?? 0 },
			{ label: 'inventory only', value: pull.summary.inventoryUpdate ?? 0 },
			{ label: 'deleted', value: pull.summary.delete ?? 0, error: false }
		].filter((chip) => chip.value > 0);

	const muted = 'text-surface-600 dark:text-surface-300';
</script>

<div class="card p-4 min-w-72 flex flex-col gap-4">
	<div class="flex justify-between items-center">
		<h4 class="h4 font-semibold">Shopify Sync</h4>
		<Button
			class="btn btn-icon btn-icon-sm text-secondary-500"
			action={client.shopify.pushSync.worker.run}
			disabled={$workerStatus?.running ?? false}
		>
			<RotateCw />
		</Button>
	</div>

	<!-- Automatic push state -->
	<div class="card variant-soft p-3 flex flex-wrap items-center gap-3">
		<div class="flex items-center gap-2 grow min-w-0">
			{#if !overview.autoPush.enabled}
				<CirclePause class="shrink-0 {muted}" />
				<div class="min-w-0">
					<p class="font-semibold">Automatic push is off</p>
					<p class="text-sm {muted}">
						{overview.autoPush.pending
							? `The unifier ran ${ago(overview.autoPush.requestedAt)}, after the last push.`
							: 'Push manually with the button above.'}
					</p>
				</div>
			{:else if $workerStatus?.running}
				<LoaderCircle class="shrink-0 animate-spin text-primary-600" />
				<div class="min-w-0">
					<p class="font-semibold">Pushing to Shopify</p>
					<p class="text-sm {muted}">Products are being sent now.</p>
				</div>
			{:else if overview.autoPush.settling}
				<Hourglass class="shrink-0 text-primary-600" />
				<div class="min-w-0">
					<p class="font-semibold">Waiting for products to settle</p>
					<p class="text-sm {muted}">
						Pushes once the unifiers and the Shopify pull have been idle for a minute.
					</p>
				</div>
			{:else}
				<CircleCheck class="shrink-0 text-primary-600" />
				<div class="min-w-0">
					<p class="font-semibold">Automatic push is on</p>
					<p class="text-sm {muted}">Changes are pushed about a minute after the unifier runs.</p>
				</div>
			{/if}
		</div>
		{#if isAdmin}
			{#if overview.autoPush.enabled}
				<Button
					class="btn btn-sm variant-ghost-surface"
					action={client.shopify.pushSync.setAutoPush}
					input={{ enabled: false }}
				>
					Turn off
				</Button>
			{:else}
				<Button
					class="btn btn-sm variant-filled-primary"
					action={client.shopify.pushSync.setAutoPush}
					input={{ enabled: true }}
					confirm="Push product changes to the live Shopify store automatically after each unifier run, including archiving unmatched listings?"
				>
					Turn on
				</Button>
			{/if}
		{/if}
	</div>

	{#if $workerStatus?.running || $workerStatus?.error}
		<WorkerStatus status={workerStatus} />
	{/if}

	<!-- Headline numbers -->
	<div class="grid grid-cols-2 gap-2">
		<div class="card variant-soft p-3">
			<p class="text-sm {muted}">Live listings</p>
			<p class="text-2xl font-semibold">{n(live)}</p>
			<p class="text-xs {muted}">
				{n(overview.listings.byStatus.DRAFT)} draft · {n(overview.listings.byStatus.ARCHIVED)} archived
			</p>
		</div>
		<div class="card variant-soft p-3">
			<p class="text-sm {muted}">Products linked to a listing</p>
			<p class="text-2xl font-semibold">{n(overview.listings.linked)}</p>
			<div
				class="h-2 my-1 rounded-full bg-primary-100 dark:bg-primary-900 overflow-hidden"
				role="meter"
				aria-label="Share of products linked to a listing"
				aria-valuemin={0}
				aria-valuemax={overview.listings.products}
				aria-valuenow={overview.listings.linked}
			>
				<div class="h-full rounded-full bg-primary-500" style="width: {linkedShare * 100}%"></div>
			</div>
			<p class="text-xs {muted}">
				{Math.round(linkedShare * 100)}% of {n(overview.listings.products)} products
			</p>
		</div>
		<div class="card variant-soft p-3">
			<p class="text-sm {muted}">Uploads failing</p>
			<p class="text-2xl font-semibold flex items-center gap-1">
				{n(overview.uploads.failed)}
				{#if overview.uploads.failed > 0}
					<TriangleAlert class="text-warning-600" size={20} aria-label="Some uploads are failing" />
				{/if}
			</p>
			<p class="text-xs {muted}">
				{n(overview.uploads.stuck)} wait for a change · {n(overview.uploads.pending)} pending
			</p>
		</div>
		<div class="card variant-soft p-3">
			<p class="text-sm {muted}">Last Shopify pull</p>
			<p
				class="text-2xl font-semibold"
				title={lastPull ? new Date(lastPull.created).toLocaleString() : ''}
			>
				{overview.pullActive ? 'Pulling…' : ago(lastPull?.created)}
			</p>
			<p class="text-xs {muted}">
				{lastPull ? `${n(lastPullChanges)} listings changed` : 'No pulls yet'}
			</p>
		</div>
	</div>

	<!-- History -->
	<div>
		<h5 class="font-semibold text-lg mb-2">Activity</h5>
		{#if activity.length === 0}
			<p class={muted}>No pushes or pulls yet.</p>
		{/if}
		<ul class="flex flex-col divide-y divide-surface-300 dark:divide-surface-600">
			{#each activity as entry (entry.kind + (entry.kind === 'push' ? entry.push.id : entry.pull.id))}
				<li class="py-2">
					{#if entry.kind === 'push'}
						{@const push = entry.push}
						{@const chips = pushChips(push)}
						<details class="group">
							<summary class="flex items-start gap-2 cursor-pointer list-none">
								<ArrowUpFromLine class="shrink-0 mt-0.5 {muted}" size={18} aria-label="Push" />
								<div class="grow min-w-0">
									<div class="flex flex-wrap items-center gap-x-2">
										<span class="font-semibold">Push</span>
										<span class="text-sm {muted}">
											{push.trigger === 'auto' ? 'automatic' : 'manual'} ·
											<span title={new Date(push.startedAt).toLocaleString()}
												>{ago(push.startedAt)}</span
											>
											{#if duration(push.startedAt, push.finishedAt)}
												· took {duration(push.startedAt, push.finishedAt)}
											{/if}
										</span>
									</div>
									<div class="flex flex-wrap gap-1 pt-1">
										{#each chips as chip (chip.label)}
											<span class="badge {chip.error ? 'variant-soft-error' : 'variant-soft'}">
												{n(chip.value)}
												{chip.label}
											</span>
										{:else}
											{#if push.status !== 'running'}
												<span class="text-sm {muted}">No changes sent</span>
											{/if}
										{/each}
									</div>
								</div>
								<span class="shrink-0 flex items-center gap-1 text-sm">
									{#if push.status === 'running'}
										<LoaderCircle class="animate-spin text-primary-600" size={18} /> Running
									{:else if push.status === 'completed'}
										<CircleCheck class="text-primary-600" size={18} /> Done
									{:else if push.status === 'failed'}
										<CircleX class="text-error-600" size={18} /> Failed
									{:else}
										<TriangleAlert class="text-warning-600" size={18} /> Interrupted
									{/if}
									<ChevronDown
										size={16}
										class="{muted} transition-transform group-open:rotate-180"
									/>
								</span>
							</summary>
							<div class="pl-7 pt-2 text-sm flex flex-col gap-2">
								{#if push.error}
									<p class="text-error-700 dark:text-error-400 break-words">{push.error}</p>
								{/if}
								{#if Object.keys(push.skipped).length > 0}
									<div>
										<p class="font-semibold">Not sent</p>
										<ul class={muted}>
											{#each Object.entries(push.skipped) as [reason, count] (reason)}
												<li>{skipLabels[reason] ?? reason}: {n(count)}</li>
											{/each}
										</ul>
									</div>
								{/if}
								{#if Object.keys(push.heldBack).length > 0}
									<div>
										<p class="font-semibold">New listings held back</p>
										<ul class={muted}>
											{#each Object.entries(push.heldBack) as [reason, count] (reason)}
												<li>{holdLabels[reason] ?? reason}: {n(count)}</li>
											{/each}
										</ul>
									</div>
								{/if}
								<p class={muted}>Started {new Date(push.startedAt).toLocaleString()}</p>
							</div>
						</details>
					{:else}
						{@const pull = entry.pull}
						{@const chips = pullChips(pull)}
						<div class="flex items-start gap-2">
							<ArrowDownToLine class="shrink-0 mt-0.5 {muted}" size={18} aria-label="Pull" />
							<div class="grow min-w-0">
								<div class="flex flex-wrap items-center gap-x-2">
									<span class="font-semibold">Pull #{pull.id}</span>
									<span class="text-sm {muted}">
										<span title={new Date(pull.created).toLocaleString()}>{ago(pull.created)}</span>
										{#if pull.file}· file #{pull.file}{/if}
									</span>
								</div>
								<div class="flex flex-wrap gap-1 pt-1">
									{#each chips as chip (chip.label)}
										<span class="badge {chip.error ? 'variant-soft-error' : 'variant-soft'}">
											{n(chip.value)}
											{chip.label}
										</span>
									{:else}
										{#if pull.status === 'completed'}
											<span class="text-sm {muted}">No listings changed</span>
										{/if}
									{/each}
								</div>
							</div>
							{#if pull.status === 'generating'}
								<span class="shrink-0 flex items-center gap-1 text-sm">
									<LoaderCircle class="animate-spin text-primary-600" size={18} /> Applying
								</span>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{#if hasMore}
			<button
				class="btn btn-sm variant-ghost-surface w-full mt-2"
				onclick={() => (historyLimit = Math.min(historyLimit + 20, MAX_HISTORY))}
			>
				Show more
			</button>
		{/if}
	</div>
</div>
