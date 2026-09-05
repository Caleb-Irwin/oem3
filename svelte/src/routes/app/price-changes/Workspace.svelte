<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { getModalStore, getToastStore, ProgressBar } from '@skeletonlabs/skeleton';
	import ListChecks from 'lucide-svelte/icons/list-checks';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import CircleX from 'lucide-svelte/icons/circle-x';
	import Clock3 from 'lucide-svelte/icons/clock-3';
	import BadgeDollarSign from 'lucide-svelte/icons/badge-dollar-sign';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Undo2 from 'lucide-svelte/icons/undo-2';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Button from '$lib/Button.svelte';
	import Form from '$lib/Form.svelte';
	import { client, handleTRPCError, subVal } from '$lib/client';
	import { formatPrice } from '$lib/formatPrice';
	import CustomPriceModal from './CustomPriceModal.svelte';
	import PriceChangeIdentity from './PriceChangeIdentity.svelte';
	import PriceMove from './PriceMove.svelte';
	import ReviewCard from './ReviewCard.svelte';
	import {
		CUSTOM_PRICE_LABELS,
		type CustomApproval,
		type PriceChangeCategory,
		type PriceChangeData,
		type PriceChangeItem,
		type PriceChangeView
	} from './types';

	interface Props {
		category: PriceChangeCategory;
		view: PriceChangeView;
		init: PriceChangeData | undefined;
		onViewChange: (view: PriceChangeView) => void;
		onComputedAt: (value: number) => void;
		onSummary: (value: PriceChangeData['summary']) => void;
	}

	let { category, view, init, onViewChange, onComputedAt, onSummary }: Props = $props();

	const dataSub = subVal(client.priceChanges.getSub, {
		input: { category },
		sendInit: init === undefined,
		init
	});
	const modalStore = getModalStore();
	const toastStore = getToastStore();

	type BulkApproval = {
		ids: number[];
		count: number;
		maxIncreasePercent: number;
		maxDecreasePercent: number;
		decidedAt: number;
	};

	type SavedReview = {
		queue: PriceChangeItem[];
		index: number;
		decisions: Record<number, 'approve' | 'reject'>;
		bulkApproval: BulkApproval | null;
	};

	const reviewStorageKey = (keyCategory: PriceChangeCategory) =>
		`priceChanges.review.${keyCategory}`;

	function loadSavedReview(keyCategory: PriceChangeCategory): SavedReview | undefined {
		if (!browser) return undefined;
		try {
			const raw = localStorage.getItem(reviewStorageKey(keyCategory));
			if (!raw) return undefined;
			const saved = JSON.parse(raw) as SavedReview;
			if (
				!Array.isArray(saved.queue) ||
				typeof saved.index !== 'number' ||
				!saved.queue.every(
					(item) => item && typeof item.id === 'number' && typeof item.status === 'string'
				)
			)
				return undefined;
			return {
				queue: saved.queue,
				index: Math.max(0, Math.min(saved.index, saved.queue.length)),
				decisions: saved.decisions ?? {},
				bulkApproval:
					saved.bulkApproval && typeof saved.bulkApproval.decidedAt === 'number'
						? saved.bulkApproval
						: null
			};
		} catch {
			return undefined;
		}
	}

	function saveReview(keyCategory: PriceChangeCategory, review: SavedReview) {
		if (!browser) return;
		try {
			const spent =
				review.index === 0 &&
				Object.keys(review.decisions).length === 0 &&
				review.bulkApproval === null;
			if (spent) localStorage.removeItem(reviewStorageKey(keyCategory));
			else localStorage.setItem(reviewStorageKey(keyCategory), JSON.stringify(review));
		} catch {
			// A blocked or full storage only costs the back history, so reviewing continues.
		}
	}

	const savedReview = loadSavedReview(category);

	let maxIncreasePercent = $state(20);
	let maxDecreasePercent = $state(20);
	let selected = $state<number[]>([]);
	let bulkApproval = $state<BulkApproval | null>(savedReview?.bulkApproval ?? null);

	/**
	 * The review queue is held locally so that deciding an item — which drops it out of the
	 * server's pending list — does not renumber everything under the reviewer and make going
	 * back to the last item impossible. It is saved to this browser so the pass survives a
	 * reload, and is dropped once the reviewed items are exported.
	 */
	let queue = $state<PriceChangeItem[]>(savedReview?.queue ?? []);
	let index = $state(savedReview?.index ?? 0);
	let decisions = $state<Record<number, 'approve' | 'reject'>>(savedReview?.decisions ?? {});
	let deciding = $state(false);
	let queueReady = savedReview !== undefined;
	let queueSyncGeneration = 0;

	const data = $derived($dataSub);
	const summary = $derived(data?.summary);

	async function reconcileQueue(loaded: PriceChangeData, generation: number) {
		const snapshot = untrack(() => queue);
		const decisionSnapshot = untrack(() => decisions);
		if (snapshot.length === 0) return;
		const statePages = await Promise.all(
			Array.from({ length: Math.ceil(snapshot.length / 400) }, (_, chunk) =>
				client.priceChanges.reviewState.query({
					ids: snapshot.slice(chunk * 400, (chunk + 1) * 400).map((item) => item.id),
					category
				})
			)
		);
		const states = statePages.flat();
		if (
			generation !== queueSyncGeneration ||
			untrack(() => queue !== snapshot || decisions !== decisionSnapshot)
		)
			return;

		untrack(() => {
			const detailsById = new Map<number, PriceChangeItem>();
			for (const item of [
				...loaded.pending,
				...loaded.approved,
				...loaded.rejected,
				...loaded.exported
			])
				detailsById.set(item.id, item);
			const stateById = new Map(states.map((state) => [state.id, state]));
			const currentId = queue[index]?.id;
			const nextDecisions = { ...decisions };
			const kept: PriceChangeItem[] = [];
			const requeued: PriceChangeItem[] = [];

			for (const item of snapshot) {
				const state = stateById.get(item.id);
				if (!state || state.status === 'exported') {
					delete nextDecisions[item.id];
					continue;
				}
				const fresh = detailsById.get(item.id);
				const updated: PriceChangeItem = {
					...(fresh ?? item),
					...state,
					changePercent: state.changePercentMilli / 1000
				};
				const targetMoved = item.targetPriceCents !== state.targetPriceCents;
				const returnedToReview =
					state.status === 'pending' &&
					(item.status !== 'pending' || targetMoved || nextDecisions[item.id] !== undefined);
				if (returnedToReview) {
					delete nextDecisions[item.id];
					// A row outside the current 400-item response returns in a later batch, when
					// its full product and price breakdown can be loaded again.
					if (fresh) requeued.push(updated);
					continue;
				}
				const serverDecision =
					state.status === 'approved'
						? 'approve'
						: state.status === 'rejected'
							? 'reject'
							: undefined;
				if (serverDecision && nextDecisions[item.id] && nextDecisions[item.id] !== serverDecision)
					delete nextDecisions[item.id];
				kept.push(updated);
			}

			queue = [...kept, ...requeued];
			decisions = nextDecisions;
			const nextCurrent = currentId ? queue.findIndex((item) => item.id === currentId) : -1;
			index = nextCurrent >= 0 ? nextCurrent : Math.min(index, queue.length);
		});
	}

	$effect(() => {
		const loaded = data;
		if (!loaded) return;
		onComputedAt(loaded.summary.computedAt);
		onSummary(loaded.summary);
		untrack(() => {
			if (!queueReady) {
				queue = loaded.pending;
				index = 0;
				queueReady = true;
			}
		});
		const generation = ++queueSyncGeneration;
		reconcileQueue(loaded, generation).catch(handleTRPCError);
	});

	$effect(() => {
		saveReview(category, { queue, index, decisions, bulkApproval });
	});

	$effect(() => {
		// Recount when the limits change and whenever the server data moves (a decision or
		// recalculation changes the pending set), debounced while the reviewer types limits.
		const pendingTotal = summary?.pending;
		const increase = maxIncreasePercent;
		const decrease = maxDecreasePercent;
		if (pendingTotal === undefined) return;
		bulkCount = null;
		let cancelled = false;
		const timer = setTimeout(() => {
			client.priceChanges.bulkCount
				.query({ category, maxIncreasePercent: increase, maxDecreasePercent: decrease })
				.then((result) => {
					if (!cancelled) bulkCount = result.count;
				})
				.catch(handleTRPCError);
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	});

	const current = $derived(queue[index]);
	const reviewedCount = $derived(Object.keys(decisions).length);
	const approvedInSession = $derived(
		Object.values(decisions).filter((decision) => decision === 'approve').length
	);
	const rejectedInSession = $derived(reviewedCount - approvedInSession);
	const decidedSinceLastExport = $derived(
		(summary?.approvedSinceLastExport ?? 0) + (summary?.rejectedSinceLastExport ?? 0)
	);
	const reviewCycleTotal = $derived((summary?.pending ?? 0) + decidedSinceLastExport);
	const progress = $derived(
		reviewCycleTotal === 0 ? 100 : (decidedSinceLastExport / reviewCycleTotal) * 100
	);

	/**
	 * How many pending changes the current limits would approve, counted by the server: only
	 * the largest changes are loaded here, so a local count would miss most of the queue.
	 */
	let bulkCount = $state<number | null>(null);

	/**
	 * The decision this browser recorded, falling back to the decision the server still holds.
	 * The fallback is what keeps undo and forward working after a reload even when the saved
	 * pass is unavailable.
	 */
	function decisionFor(item: PriceChangeItem | undefined): 'approve' | 'reject' | undefined {
		if (!item) return undefined;
		if (item.status === 'approved') return 'approve';
		if (item.status === 'rejected') return 'reject';
		if (decisions[item.id]) return decisions[item.id];
		return undefined;
	}

	function decisionInput(item: PriceChangeItem, decision: 'approve' | 'reject' | 'reset') {
		if (item.status === 'exported') throw new Error('An exported price change cannot be changed');
		return {
			ids: [item.id],
			decision,
			expectedStatus: item.status,
			expectedTargetPriceCents: item.targetPriceCents,
			expectedDecidedAt: item.decidedAt
		};
	}

	async function decide(decision: 'approve' | 'reject') {
		const item = current;
		if (!item || deciding) return;
		const previousDecision = decisionFor(item);
		if (previousDecision === decision) {
			index = Math.min(index + 1, queue.length);
			return;
		}
		deciding = true;
		decisions = { ...decisions, [item.id]: decision };
		index += 1;
		try {
			const result = await client.priceChanges.decide.mutate(decisionInput(item, decision));
			const changed = result.changes[0];
			if (changed)
				queue = queue.map((row) => (row.id === changed.id ? { ...row, ...changed } : row));
		} catch (e) {
			index = Math.max(0, index - 1);
			const restored = { ...decisions };
			if (previousDecision === undefined) delete restored[item.id];
			else restored[item.id] = previousDecision;
			decisions = restored;
			handleTRPCError(e);
		} finally {
			deciding = false;
		}
	}

	function back() {
		if (!deciding && index > 0) index -= 1;
	}

	function forward() {
		if (!deciding && current && decisionFor(current)) {
			index = Math.min(index + 1, queue.length);
		}
	}

	async function undoCurrent() {
		const item = current;
		if (!item || deciding || !decisionFor(item)) return;
		deciding = true;
		const previousDecision = decisions[item.id];
		const restored = { ...decisions };
		delete restored[item.id];
		decisions = restored;
		try {
			const result = await client.priceChanges.decide.mutate(decisionInput(item, 'reset'));
			const changed = result.changes[0];
			if (changed)
				queue = queue.map((row) => (row.id === changed.id ? { ...row, ...changed } : row));
		} catch (e) {
			if (previousDecision !== undefined) decisions = { ...decisions, [item.id]: previousDecision };
			handleTRPCError(e);
		} finally {
			deciding = false;
		}
	}

	function openCustomPrice(item: PriceChangeItem) {
		modalStore.trigger({
			type: 'component',
			component: { ref: CustomPriceModal, props: { item } }
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (view !== 'review' || !current) return;
		if ($modalStore.length > 0) return;
		if (event.repeat) return;
		const target = event.target;
		if (
			target instanceof Element &&
			target.closest(
				'a, button, input, select, summary, textarea, [contenteditable="true"], [role="button"]'
			)
		)
			return;
		if (event.metaKey || event.ctrlKey || event.altKey) return;

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			decide('reject');
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			decide('approve');
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			back();
		} else if (event.key === 'ArrowDown' && decisionFor(current)) {
			event.preventDefault();
			forward();
		}
	}

	async function resolveCustomApproval(row: CustomApproval, keep: boolean) {
		try {
			await client.unified.updateError.mutate({
				compoundId: row.compoundId,
				col: row.col,
				errorAction: keep ? 'keepCustom' : 'setAuto',
				errorId: row.errorId
			});
		} catch (e) {
			handleTRPCError(e);
		}
	}

	async function loadNextBatch() {
		try {
			const refreshed = await client.priceChanges.get.query({ category });
			queue = refreshed.pending;
			index = 0;
			decisions = {};
			bulkApproval = null;
			onSummary(refreshed.summary);
		} catch (e) {
			handleTRPCError(e);
		}
	}

	const tabs = [
		{
			value: 'review' as const,
			label: 'Review',
			detail: 'Needs a decision',
			icon: ListChecks,
			count: () => summary?.pending ?? 0
		},
		{
			value: 'approved' as const,
			label: 'Approved',
			detail: 'Ready to export',
			icon: CircleCheck,
			count: () => summary?.approved ?? 0
		},
		{
			value: 'rejected' as const,
			label: 'Rejected',
			detail: 'Held until target moves',
			icon: CircleX,
			count: () => summary?.rejected ?? 0
		},
		{
			value: 'exported' as const,
			label: 'Awaiting QB',
			detail: 'Exported, not imported',
			icon: Clock3,
			count: () => summary?.exported ?? 0
		},
		{
			value: 'custom' as const,
			label: 'Custom prices',
			detail: 'Overrides to confirm',
			icon: BadgeDollarSign,
			count: () => summary?.customApprovals ?? 0
		}
	];

	const listForView = $derived(
		view === 'approved'
			? (data?.approved ?? [])
			: view === 'rejected'
				? (data?.rejected ?? [])
				: view === 'exported'
					? (data?.exported ?? [])
					: []
	);

	function toggleSelected(id: number) {
		selected = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet changeRow(item: PriceChangeItem, selectable: boolean)}
	<li class="card p-3">
		<div class="flex min-w-0 flex-wrap items-center gap-3">
			{#if selectable}
				<input
					class="checkbox shrink-0"
					type="checkbox"
					checked={selected.includes(item.id)}
					onchange={() => toggleSelected(item.id)}
					aria-label="Select {item.title ?? 'product'}"
				/>
			{/if}
			<div class="min-w-[15rem] flex-grow">
				<PriceChangeIdentity {item} />
			</div>
			<PriceMove
				currentPriceCents={item.currentPriceCents}
				targetPriceCents={item.targetPriceCents}
				changePercent={item.changePercent}
			/>
		</div>
		<div
			class="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-surface-200 pt-2 dark:border-surface-700"
		>
			<button
				class="btn btn-sm whitespace-nowrap variant-ghost-secondary"
				onclick={() => openCustomPrice(item)}
				title="Set a custom price"
			>
				<Pencil size={15} /><span class="pl-1">Custom</span>
			</button>
			{#if item.status !== 'exported'}
				<Button
					class="btn btn-sm whitespace-nowrap {item.status === 'approved'
						? 'variant-ghost-error'
						: 'variant-ghost-success'}"
					action={client.priceChanges.decide}
					input={decisionInput(item, item.status === 'approved' ? 'reject' : 'approve')}
				>
					{#if item.status === 'approved'}
						<CircleX size={15} /><span class="pl-1">Reject</span>
					{:else}
						<CircleCheck size={15} /><span class="pl-1">Approve</span>
					{/if}
				</Button>
				<Button
					class="btn btn-sm whitespace-nowrap variant-ghost"
					action={client.priceChanges.decide}
					input={decisionInput(item, 'reset')}
				>
					<Undo2 size={15} /><span class="pl-1">Undo</span>
				</Button>
			{/if}
		</div>
	</li>
{/snippet}

{#snippet reviewSummary()}
	<div class="card mt-3 overflow-hidden p-0">
		<div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
			<div>
				<p
					class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400"
				>
					Since the last export
					{#if !summary?.lastExportAt}
						<span class="normal-case tracking-normal opacity-70"> · no exports yet</span>
					{/if}
				</p>
				<p class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
					<span class="text-success-700 dark:text-success-400">
						<strong class="text-lg tabular-nums">
							{summary?.approvedSinceLastExport ?? 0}
						</strong>
						approved
					</span>
					<span class="text-error-700 dark:text-error-400">
						<strong class="text-lg tabular-nums">
							{summary?.rejectedSinceLastExport ?? 0}
						</strong>
						rejected
					</span>
					<span class="text-surface-600 dark:text-surface-300">
						<strong class="text-lg tabular-nums text-surface-900 dark:text-surface-50">
							{summary?.pending ?? 0}
						</strong>
						remaining
					</span>
				</p>
			</div>
			{#if current}
				<p class="text-right text-xs text-surface-500 dark:text-surface-400">
					Item {index + 1} of {queue.length} loaded
					{#if summary && summary.pending > summary.listLimit}
						<br />Showing the {summary.listLimit} largest changes
					{/if}
				</p>
			{/if}
		</div>
		<ProgressBar
			value={progress}
			max={100}
			meter="bg-primary-500"
			track="bg-primary-100 dark:bg-primary-900"
		/>
	</div>
{/snippet}

{#if !data}
	<div class="w-full max-w-lg py-2">
		<ProgressBar meter="bg-primary-500" track="bg-primary-100 dark:bg-primary-900" />
	</div>
{:else}
	<nav
		class="grid grid-cols-2 gap-1 rounded-lg bg-surface-200 p-1 dark:bg-surface-700 sm:grid-cols-3 lg:grid-cols-5"
		aria-label="Price change workflow"
	>
		{#each tabs as tab}
			<button
				class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 rounded-md px-2.5 py-2 text-left transition-colors last:col-span-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:last:col-span-1 {view ===
				tab.value
					? 'bg-surface-50 text-surface-900 shadow-sm dark:bg-surface-800 dark:text-surface-50'
					: 'text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-surface-50'}"
				aria-pressed={view === tab.value}
				onclick={() => onViewChange(tab.value)}
			>
				<span
					class="row-span-2 hidden h-8 w-8 shrink-0 place-content-center rounded-md sm:grid {view ===
					tab.value
						? 'bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300'
						: 'bg-surface-300/70 text-surface-600 dark:bg-surface-800 dark:text-surface-300'}"
				>
					<tab.icon size={17} />
				</span>
				<span class="truncate text-sm font-semibold">{tab.label}</span>
				<span
					class="rounded-full bg-surface-300/70 px-2 py-0.5 text-xs font-semibold tabular-nums dark:bg-surface-700"
				>
					{tab.count()}
				</span>
				<span class="col-span-2 col-start-1 truncate text-xs opacity-75 sm:col-start-2">
					{tab.detail}
				</span>
			</button>
		{/each}
	</nav>

	{#if view === 'review'}
		{@render reviewSummary()}

		{#if bulkApproval}
			<div
				class="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-success-300 bg-success-50/70 px-3 py-2.5 dark:border-success-800 dark:bg-success-900/20"
			>
				<div
					class="grid h-8 w-8 shrink-0 place-content-center rounded-md bg-success-100 text-success-700 dark:bg-success-900/60 dark:text-success-300"
				>
					<CircleCheck size={18} />
				</div>
				<div class="min-w-0 flex-grow">
					<p class="text-sm font-semibold">
						{bulkApproval.count}
						{bulkApproval.count === 1 ? 'change' : 'changes'} approved
					</p>
					<p class="text-xs text-surface-600 dark:text-surface-300">
						Limits used: +{bulkApproval.maxIncreasePercent}% and -{bulkApproval.maxDecreasePercent}%
					</p>
				</div>
				<Button
					class="btn btn-sm variant-ghost"
					action={client.priceChanges.decide}
					input={{
						ids: bulkApproval.ids,
						decision: 'reset',
						expectedStatus: 'approved',
						expectedDecidedAt: bulkApproval.decidedAt
					}}
					res={async () => {
						const refreshed = await client.priceChanges.get.query({ category });
						bulkApproval = null;
						decisions = {};
						queue = refreshed.pending;
						index = 0;
						onSummary(refreshed.summary);
					}}
					successMessage="Bulk approval undone"
				>
					<Undo2 size={16} /><span class="pl-1">Undo and adjust limits</span>
				</Button>
			</div>
		{:else}
			<details class="card group mt-3 overflow-hidden p-0" open>
				<summary
					class="flex cursor-pointer list-none items-center gap-3 p-3 hover:bg-surface-100/70 dark:hover:bg-surface-800/60"
				>
					<span
						class="grid h-8 w-8 shrink-0 place-content-center rounded-md bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300"
					>
						<Sparkles size={17} />
					</span>
					<span class="min-w-0 flex-grow">
						<span class="block text-sm font-semibold">Approve small changes</span>
						<span class="block truncate text-xs text-surface-600 dark:text-surface-300">
							Approve a range at once, then review everything outside it.
						</span>
					</span>
					<span class="hidden items-center gap-1.5 text-xs tabular-nums sm:flex">
						<span
							class="rounded-full bg-error-100 px-2 py-1 text-error-700 dark:bg-error-900/40 dark:text-error-300"
						>
							-{maxDecreasePercent}%
						</span>
						<span class="text-surface-400">to</span>
						<span
							class="rounded-full bg-success-100 px-2 py-1 text-success-700 dark:bg-success-900/40 dark:text-success-300"
						>
							+{maxIncreasePercent}%
						</span>
					</span>
					<ChevronDown
						size={17}
						class="shrink-0 text-surface-500 transition-transform group-open:rotate-180"
					/>
				</summary>
				<Form
					action={client.priceChanges.bulkApprove}
					input={{ category }}
					noReset
					res={(result) => {
						if (result.count === 0) {
							toastStore.trigger({
								message: 'No pending changes fit those limits',
								background: 'variant-filled-secondary'
							});
							return;
						}
						bulkApproval = {
							ids: result.ids,
							count: result.count,
							maxIncreasePercent,
							maxDecreasePercent,
							decidedAt: result.decidedAt
						};
						const approvedIds = new Set(result.ids);
						const currentId = queue[index]?.id;
						queue = queue.filter((item) => !approvedIds.has(item.id));
						const nextCurrent = currentId ? queue.findIndex((item) => item.id === currentId) : -1;
						index = nextCurrent >= 0 ? nextCurrent : Math.min(index, queue.length);
						toastStore.trigger({
							message: `${result.count} ${result.count === 1 ? 'change' : 'changes'} approved`,
							background: 'variant-filled-success'
						});
					}}
					class="w-full border-t border-surface-200 p-4 dark:border-surface-700"
				>
					<div class="grid gap-3 sm:grid-cols-2">
						<label class="block">
							<span
								class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400"
							>
								Increases up to
							</span>
							<div class="input-group mt-1 grid-cols-[minmax(0,1fr)_auto]">
								<input
									class="min-w-0 bg-transparent text-right font-semibold tabular-nums outline-none"
									type="number"
									name="maxIncreasePercent"
									min="0"
									max="1000"
									step="0.1"
									aria-label="Approve increases up to this percent"
									bind:value={maxIncreasePercent}
								/>
								<div class="input-group-shim font-semibold">%</div>
							</div>
						</label>
						<label class="block">
							<span
								class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400"
							>
								Decreases up to
							</span>
							<div class="input-group mt-1 grid-cols-[minmax(0,1fr)_auto]">
								<input
									class="min-w-0 bg-transparent text-right font-semibold tabular-nums outline-none"
									type="number"
									name="maxDecreasePercent"
									min="0"
									max="1000"
									step="0.1"
									aria-label="Approve decreases up to this percent"
									bind:value={maxDecreasePercent}
								/>
								<div class="input-group-shim font-semibold">%</div>
							</div>
						</label>
					</div>
					<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
						<p
							class="text-sm {bulkCount === 0 || bulkCount === null
								? 'text-surface-500 dark:text-surface-400'
								: 'text-surface-700 dark:text-surface-200'}"
						>
							{#if bulkCount === null}
								Counting the changes that fit…
							{:else if bulkCount === 0}
								No pending changes fit those limits.
							{:else}
								<strong class="tabular-nums">{bulkCount}</strong>
								pending {bulkCount === 1 ? 'change fits' : 'changes fit'} these limits.
							{/if}
						</p>
						<button
							class="btn shrink-0 variant-filled-primary"
							disabled={bulkCount === null || bulkCount === 0}
						>
							Approve {bulkCount ?? '…'}
							{bulkCount === 1 ? 'change' : 'changes'}
						</button>
					</div>
				</Form>
			</details>
		{/if}

		<div class="pt-3">
			{#if current}
				<ReviewCard
					item={current}
					decision={decisionFor(current)}
					canGoBack={index > 0}
					busy={deciding}
					canGoForward={decisionFor(current) !== undefined}
					approve={() => decide('approve')}
					reject={() => decide('reject')}
					{back}
					{forward}
					undo={undoCurrent}
					editPrice={() => openCustomPrice(current)}
				/>
			{:else}
				<div class="card p-8 text-center">
					<p class="text-lg font-semibold">
						{summary?.pending === 0 && (summary.approved > 0 || summary.rejected > 0)
							? 'Review complete'
							: queue.length === 0
								? 'No price changes to review'
								: 'Everything loaded has been reviewed'}
					</p>
					<p class="pt-1 text-surface-600 dark:text-surface-300">
						{summary?.pending === 0 && summary.approved > 0
							? `${summary.approved} approved ${summary.approved === 1 ? 'change is' : 'changes are'} ready to export.`
							: summary?.pending === 0 && summary.rejected > 0
								? 'No changes were approved for export.'
								: queue.length === 0
									? 'QuickBooks matches the target price for every product in this category.'
									: `${approvedInSession} approved and ${rejectedInSession} rejected in this pass.`}
					</p>
					<div class="mt-4 flex flex-wrap justify-center gap-2">
						{#if index > 0}
							<button class="btn variant-ghost" onclick={back}>Back to last item</button>
						{/if}
						{#if summary?.pending === 0 && summary.approved > 0}
							<button class="btn variant-filled-primary" onclick={() => onViewChange('approved')}>
								Go to export <ArrowRight size={18} />
							</button>
						{/if}
						{#if summary && summary.pending > 0 && index >= queue.length}
							<button class="btn variant-filled-primary" onclick={loadNextBatch}>
								Load next {Math.min(summary.pending, summary.listLimit)}
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{:else if view === 'custom'}
		<ul class="space-y-2">
			{#each data.customApprovals as row (row.errorId)}
				<li class="card flex flex-wrap items-center gap-3 p-3">
					<div class="min-w-0 flex-grow">
						<p class="line-clamp-2 font-semibold">{row.title ?? 'Unnamed Product'}</p>
						<p class="text-sm text-surface-600 dark:text-surface-300">
							{CUSTOM_PRICE_LABELS[row.col]} is pinned to
							<strong class="text-surface-900 dark:text-surface-50">
								{row.customPriceCents === null
									? 'no value'
									: formatPrice(row.customPriceCents / 100)}
							</strong>
							but the automatic price is now
							<strong class="text-surface-900 dark:text-surface-50">
								{row.autoPriceCents === null ? 'unset' : formatPrice(row.autoPriceCents / 100)}
							</strong>
						</p>
						<a class="anchor text-sm" href="/app/resource/{row.uniId}">Open product</a>
					</div>
					<div class="flex gap-1">
						<button
							class="btn btn-sm variant-ghost-secondary"
							onclick={() => resolveCustomApproval(row, true)}
						>
							Keep custom
						</button>
						<button
							class="btn btn-sm variant-ghost"
							onclick={() => resolveCustomApproval(row, false)}
						>
							Use automatic
						</button>
					</div>
				</li>
			{:else}
				<li class="card p-8 text-center">
					<p class="text-lg font-semibold">No custom prices need approval</p>
					<p class="pt-1 text-surface-600 dark:text-surface-300">
						Custom prices set to re-approve show up here when the price they replaced moves.
					</p>
				</li>
			{/each}
		</ul>
	{:else}
		{#if view === 'approved'}
			<div class="card mb-3 flex flex-wrap items-center justify-between gap-3 p-4">
				<div>
					<h2 class="h4 font-semibold">Export to shelf tag sheet</h2>
					<p class="text-sm text-surface-600 dark:text-surface-300">
						{selected.length > 0
							? `Exports the ${selected.length} selected ${selected.length === 1 ? 'change' : 'changes'}.`
							: 'Exports every approved change in this category, then opens the new sheet.'}
					</p>
				</div>
				<Button
					class="btn variant-filled-primary"
					action={client.priceChanges.exportApproved}
					input={{ category, ids: selected.length > 0 ? selected : undefined }}
					res={async (result) => {
						if (selected.length > 0) {
							// A partial export only clears the exported items from the pass; the rest of
							// the queue keeps its place and its back history.
							const exportedIds = new Set(selected);
							queue = queue.filter((item) => !exportedIds.has(item.id));
							const remaining = { ...decisions };
							for (const id of exportedIds) delete remaining[id];
							decisions = remaining;
							index = Math.min(index, queue.length);
						} else {
							queue = [];
							index = 0;
							decisions = {};
							bulkApproval = null;
						}
						selected = [];
						await goto(`/app/shelf?sheet=${result.sheetId}`);
					}}
					successMessage="Exported to a new shelf tag sheet"
				>
					Export {selected.length > 0 ? selected.length : (summary?.approved ?? 0)} to sheet
				</Button>
			</div>
		{/if}

		<ul class="space-y-2">
			{#each listForView as item (item.id)}
				{@render changeRow(item, view === 'approved')}
			{:else}
				<li class="card p-8 text-center">
					<p class="text-lg font-semibold">
						{view === 'approved'
							? 'Nothing approved yet'
							: view === 'rejected'
								? 'Nothing rejected'
								: 'Nothing waiting on QuickBooks'}
					</p>
					<p class="pt-1 text-surface-600 dark:text-surface-300">
						{view === 'exported'
							? 'Exported changes stay here until a QuickBooks import shows the new price.'
							: 'Work through the review queue to fill this list.'}
					</p>
				</li>
			{/each}
		</ul>
	{/if}
{/if}
