<script lang="ts">
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import Moon from 'lucide-svelte/icons/moon';
	import RotateCw from 'lucide-svelte/icons/rotate-cw';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Undo2 from 'lucide-svelte/icons/undo-2';
	import SearchField from '$lib/search/SearchField.svelte';
	import { client, handleTRPCError, subVal } from '$lib/client';
	import CreateOrder from '../CreateOrder.svelte';
	import InventoryChart from '../InventoryChart.svelte';
	import ItemIdentity from '../ItemIdentity.svelte';
	import QuantityTiles from '../QuantityTiles.svelte';
	import { getPlannerContext, toggleGroup, toggleId } from '../planner';
	import type { OrderPlannerOrder } from '../types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type SmartItem = PageData['smartOrder']['items'][number];
	type WarningFilter = 'active' | 'outOfStock' | 'slept' | 'dismissed';

	const { data: plannerStore, canEdit } = getPlannerContext();
	const toast = getToastStore();
	const modal = getModalStore();

	const smartOrderSub = subVal(client.orderPlanner.smartOrder.getSub, { init: data.smartOrder });
	const workerStatus = subVal(client.orderPlanner.smartOrder.worker.statusSub, { init: undefined });
	const smartOrder = $derived($smartOrderSub ?? data.smartOrder);
	const summary = $derived(smartOrder.summary);
	const openOrders = $derived($plannerStore.orders.filter((order) => order.status !== 'completed'));
	const refreshing = $derived($workerStatus?.running ?? false);

	let filter = $state('');
	let warningFilter = $state<WarningFilter>('active');
	let selected = $state<number[]>([]);
	let expandedVendors = $state(new Set<string>());
	let openMenu = $state<'bulk' | number | null>(null);
	let busy = $state(false);

	const visibleItems = $derived.by(() => {
		const query = filter.trim().toLowerCase();
		return smartOrder.items.filter((item) => {
			const slept = item.snoozed && !item.dismissed;
			const paused = item.dismissed || slept;
			if (
				warningFilter === 'slept' ? !slept : warningFilter === 'dismissed' ? !item.dismissed : false
			)
				return false;
			if (
				(warningFilter === 'active' || warningFilter === 'outOfStock') &&
				(paused || item.alreadyPlanned)
			)
				return false;
			if (
				warningFilter === 'outOfStock' &&
				(item.availableQuantity === null || item.availableQuantity > 0)
			)
				return false;
			if (!query) return true;
			return [item.vendor, item.description, item.productName, item.qbId, item.upc].some((value) =>
				value?.toLowerCase().includes(query)
			);
		});
	});

	/** Suppliers with the nearest run-out lead, so the work that cannot wait is at the top. */
	const grouped = $derived.by(() => {
		const groups = new Map<string, SmartItem[]>();
		for (const item of visibleItems) {
			const vendor = item.vendor || 'No preferred vendor';
			const bucket = groups.get(vendor);
			if (bucket) bucket.push(item);
			else groups.set(vendor, [item]);
		}
		const urgency = (item: SmartItem) => item.projectedStockoutAt ?? Infinity;
		return [...groups.entries()]
			.map(([vendor, items]) => {
				const sorted = items.sort((a, b) => urgency(a) - urgency(b));
				return { vendor, items: sorted, urgency: urgency(sorted[0]) };
			})
			.sort(
				(a, b) =>
					a.urgency - b.urgency ||
					a.vendor.localeCompare(b.vendor, undefined, { sensitivity: 'base' })
			);
	});

	const outOfStock = $derived(
		smartOrder.items.filter(
			(item) =>
				!item.dismissed &&
				!item.snoozed &&
				!item.alreadyPlanned &&
				item.availableQuantity !== null &&
				item.availableQuantity <= 0
		).length
	);
	const stats = $derived([
		{ label: 'need now', value: summary.now, tone: 'error' },
		{ label: `within ${summary.soonDays} days`, value: summary.soon, tone: 'warning' },
		{ label: 'out of stock', value: outOfStock, tone: 'plain' },
		{ label: 'already in an order', value: summary.alreadyPlanned, tone: 'plain' },
		{ label: 'need more history', value: summary.insufficient, tone: 'plain' },
		{ label: 'paused', value: summary.dismissed + summary.snoozed, tone: 'plain' }
	]);

	$effect(() => {
		const visibleIds = new Set(visibleItems.map((item) => item.qbRow));
		const remaining = selected.filter((id) => visibleIds.has(id));
		if (remaining.length !== selected.length) selected = remaining;
		if (typeof openMenu === 'number' && !visibleIds.has(openMenu)) openMenu = null;
	});

	const dateFormat = new Intl.DateTimeFormat('en-CA', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const day = (time: number) => dateFormat.format(time);
	/** Slow movers round to 0.00/day, so anything under half a unit a day reads per month. */
	const rate = (perDay: number) =>
		perDay >= 0.5 ? `${perDay.toFixed(1)}/day` : `${(perDay * 30).toFixed(1)}/month`;
	const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

	function itemName(item: SmartItem) {
		return item.description || item.productName || item.qbId;
	}
	function resourceHref(item: SmartItem) {
		return item.uniId
			? `/app/resource/${item.uniId}/unified`
			: `/app/resource/redirect/qb-${item.qbRow}`;
	}
	function daysUntil(time: number) {
		return Math.max(1, Math.ceil((time - Date.now()) / 86400000));
	}
	/** The headline reason, kept to one line; `reorderDetail` carries the arithmetic. */
	function reorderReason(item: SmartItem) {
		if (item.dailyDepletion === null || item.suggestedQuantity === null)
			return 'Not enough movement yet to size a reorder.';
		return `About ${plural(Math.round(item.observedDepletion), 'unit')} used over ${plural(
			Math.round(item.observedDays),
			'day'
		)} (${rate(item.dailyDepletion)}).`;
	}
	function reorderDetail(item: SmartItem) {
		if (item.dailyDepletion === null || item.suggestedQuantity === null)
			return `A rate needs three snapshots spanning 14 days. So far: ${plural(item.sampleCount, 'snapshot')} over ${item.spanDays.toFixed(0)} days.`;
		const restocks = item.restockCount
			? ` ${plural(item.restockCount, 'restock interval')} excluded from the rate.`
			: '';
		return [
			`Covers ${summary.planDays} days at ${item.dailyDepletion.toFixed(3)}/day:`,
			`about ${Math.ceil(item.dailyDepletion * summary.planDays)} units of demand,`,
			`minus ${item.availableQuantity ?? 0} available and ${item.quantityOnPurchaseOrder ?? 0} incoming.`,
			`Rate measured from ${Math.round(item.observedDepletion)} units of decline over`,
			`${Math.round(item.observedDays)} non-restock days, across ${plural(item.sampleCount, 'snapshot')}`,
			`spanning ${item.spanDays.toFixed(0)} days.${restocks}`
		].join(' ');
	}
	function runOutLabel(item: SmartItem) {
		if (item.projectedStockoutAt === null) return 'Run-out not estimated';
		return item.projectedStockoutAt > Date.now()
			? `Runs out ~${day(item.projectedStockoutAt)} · ${daysUntil(item.projectedStockoutAt)} days`
			: `Run-out estimated ${day(item.projectedStockoutAt)}`;
	}

	function toggleVendor(vendor: string) {
		const next = new Set(expandedVendors);
		if (next.has(vendor)) next.delete(vendor);
		else next.add(vendor);
		expandedVendors = next;
	}
	function setAllExpanded(expanded: boolean) {
		expandedVendors = expanded ? new Set(grouped.map((group) => group.vendor)) : new Set();
	}
	function closeMenus() {
		openMenu = null;
	}
	function confirm(title: string) {
		return new Promise<boolean>((resolve) =>
			modal.trigger({ type: 'confirm', title, response: resolve })
		);
	}
	/** Every mutation clears the rows it touched from the selection and reports failure the same way. */
	async function run(qbRows: number[], action: () => Promise<unknown>) {
		closeMenus();
		busy = true;
		try {
			await action();
			selected = selected.filter((id) => !qbRows.includes(id));
		} catch (error) {
			handleTRPCError(error);
		} finally {
			busy = false;
		}
	}

	async function dismiss(qbRows: number[]) {
		const them = qbRows.length === 1 ? 'it' : 'them';
		if (
			!(await confirm(
				`Hide Smart Order warnings for ${plural(qbRows.length, 'item')} until you restore ${them}? This survives recalculations and imports, and you can undo it from the Permanently dismissed filter.`
			))
		)
			return;
		await run(qbRows, () => client.orderPlanner.smartOrder.dismiss.mutate({ qbRows }));
	}
	const restore = (qbRows: number[]) =>
		run(qbRows, () => client.orderPlanner.smartOrder.restore.mutate({ qbRows }));
	const wake = (qbRows: number[]) =>
		run(qbRows, () => client.orderPlanner.smartOrder.wake.mutate({ qbRows }));

	function snooze(qbRows: number[], preset: 'stockout' | 'oneMonth' | 'threeMonths') {
		return run(qbRows, async () => {
			const result = await client.orderPlanner.smartOrder.snooze.mutate({ qbRows, preset });
			if (result.skipped)
				toast.trigger({
					message: `${plural(result.skipped, 'item')} had no future run-out estimate`,
					background: 'variant-filled-warning'
				});
		});
	}
	function addToOrder(orderId: number) {
		const qbRows = [...selected];
		return run(qbRows, async () => {
			const result = await client.orderPlanner.smartOrder.addToOrder.mutate({ qbRows, orderId });
			toast.trigger({
				message: `${result.added} added, ${result.skipped} skipped`,
				background: result.added > 0 ? 'variant-filled-success' : 'variant-filled-warning'
			});
		});
	}
	function createOrder() {
		modal.trigger({
			type: 'component',
			component: {
				ref: CreateOrder,
				props: { res: async (order: OrderPlannerOrder) => addToOrder(order.id) }
			}
		});
	}
	async function refresh() {
		try {
			await client.orderPlanner.smartOrder.refresh.mutate();
			toast.trigger({ message: 'Recalculating…', background: 'variant-filled-primary' });
		} catch (error) {
			handleTRPCError(error);
		}
	}
	function clearFilters() {
		filter = '';
		warningFilter = 'active';
	}

	const snoozePresets = [
		{ preset: 'stockout', label: 'Sleep until run-out' },
		{ preset: 'oneMonth', label: 'Sleep for 1 month' },
		{ preset: 'threeMonths', label: 'Sleep for 3 months' }
	] as const;
</script>

<svelte:window
	onpointerdown={(event) => {
		if (!(event.target instanceof Element) || !event.target.closest('[data-menu-root]'))
			closeMenus();
	}}
	onkeydown={(event) => event.key === 'Escape' && closeMenus()}
/>

<section class="card mb-4 p-4">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<h2 class="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
				<Sparkles size={18} class="text-primary-600 dark:text-primary-400" />
				Smart Order
				<span class="font-normal text-surface-500 dark:text-surface-300">
					— reorder suggestions from QuickBooks inventory history
				</span>
			</h2>
			<p class="text-sm text-surface-600 dark:text-surface-300">
				Uses up to a year of snapshots and recalculates after each completed import. Usage is
				estimated from inventory changes, not direct invoices.
			</p>
		</div>
		{#if canEdit}
			<div class="flex shrink-0 flex-col items-end gap-1">
				<button
					class="btn btn-sm variant-soft-primary gap-2"
					onclick={refresh}
					disabled={refreshing}
				>
					<RotateCw size={16} class={refreshing ? 'animate-spin' : ''} />
					{refreshing ? 'Recalculating…' : 'Recalculate'}
				</button>
				{#if refreshing || $workerStatus?.error}
					<span
						class="text-xs {$workerStatus?.error
							? 'text-error-700 dark:text-error-300'
							: 'text-surface-500 dark:text-surface-300'}"
					>
						{$workerStatus?.error
							? $workerStatus.message
							: ($workerStatus?.progress ?? -1) >= 0
								? `${Math.round($workerStatus?.progress ?? 0)}%`
								: 'Starting…'}
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<div class="mt-3 flex flex-wrap items-center gap-2">
		{#each stats as stat (stat.label)}
			<span
				class="rounded-full px-2.5 py-1 text-xs font-medium {stat.tone === 'error'
					? 'bg-error-100 text-error-800 dark:bg-error-900/40 dark:text-error-200'
					: stat.tone === 'warning'
						? 'bg-warning-100 text-warning-900 dark:bg-warning-900/40 dark:text-warning-100'
						: 'bg-surface-200 text-surface-700 dark:bg-surface-700 dark:text-surface-100'}"
			>
				<strong class="tabular-nums">{stat.value}</strong>
				{stat.label}
			</span>
		{/each}
	</div>

	<p class="mt-2 text-xs text-surface-500 dark:text-surface-300">
		{#if summary.computedAt > 0}
			Calculated {new Date(summary.computedAt).toLocaleString()}.
		{:else}
			Waiting for the first calculation.
		{/if}
		{#if summary.stale}
			<span class="font-medium text-warning-700 dark:text-warning-300">
				A newer inventory import is available — recalculate to use it.
			</span>
		{/if}
	</p>
</section>

<div class="mb-4">
	<SearchField
		size="lg"
		queryType="qb"
		queryTypes={['qb']}
		placeholder="Filter by item or supplier"
		ariaLabel="Filter Smart Order"
		showSubmitButton={false}
		bind:query={filter}
	>
		{#snippet trailing(place)}
			<label class="relative flex items-stretch {place === 'pill' ? 'h-full' : 'h-10'}">
				<span class="sr-only">Filter Smart Order warnings</span>
				<select
					bind:value={warningFilter}
					class="cursor-pointer appearance-none bg-none py-0 text-sm font-medium dark:[color-scheme:dark] {place ===
					'pill'
						? 'h-full border-0 bg-transparent pl-3 pr-7 outline-none focus:!outline-none focus:ring-0'
						: 'select h-full w-full pl-3 pr-9'}"
				>
					<option value="active">Active warnings</option>
					<option value="outOfStock">Out of stock</option>
					<option value="slept">Slept</option>
					<option value="dismissed">Permanently dismissed</option>
				</select>
				<ChevronDown
					size={16}
					class="pointer-events-none absolute top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-300 {place ===
					'pill'
						? 'right-1.5'
						: 'right-3'}"
				/>
			</label>
		{/snippet}
	</SearchField>
</div>

{#if selected.length > 0 && canEdit}
	<div
		class="sticky top-2 z-20 mb-3 flex flex-col gap-2 rounded-lg bg-primary-700 p-3 text-white shadow-lg sm:flex-row sm:items-center"
	>
		<span class="min-w-fit font-medium">{selected.length} selected</span>

		{#if warningFilter === 'active' || warningFilter === 'outOfStock'}
			<label class="min-w-0 flex-1">
				<span class="sr-only">Move selected items to an order</span>
				<select
					class="select w-full text-surface-900"
					value=""
					disabled={busy}
					onchange={(event) => {
						const value = event.currentTarget.value;
						event.currentTarget.value = '';
						if (value === 'create') createOrder();
						else if (value) void addToOrder(Number(value));
					}}
				>
					<option value="">Move to an order…</option>
					<option value="create">+ Create a new order…</option>
					{#each openOrders as order (order.id)}
						<option value={order.id}>{order.name}</option>
					{/each}
				</select>
			</label>

			<div class="relative shrink-0" data-menu-root>
				<button
					class="btn w-full gap-2 bg-white text-primary-800 hover:bg-primary-50 sm:w-auto"
					aria-haspopup="menu"
					aria-expanded={openMenu === 'bulk'}
					disabled={busy}
					onclick={() => (openMenu = openMenu === 'bulk' ? null : 'bulk')}
				>
					<Moon size={16} />
					Sleep selected
				</button>
				{#if openMenu === 'bulk'}
					<div
						class="card absolute left-0 z-30 mt-1 w-48 border border-surface-300 bg-white p-1 text-surface-900 shadow-xl dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50"
						role="menu"
					>
						{#each snoozePresets as option (option.preset)}
							<button
								class="w-full rounded px-3 py-2 text-left text-sm hover:bg-surface-100 dark:hover:bg-surface-700"
								role="menuitem"
								onclick={() => void snooze(selected, option.preset)}
							>
								{option.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<button
				class="btn shrink-0 gap-2 bg-error-600 text-white hover:bg-error-700"
				disabled={busy}
				onclick={() => void dismiss(selected)}
			>
				<Trash2 size={16} />
				Dismiss warnings
			</button>
		{:else}
			<button
				class="btn shrink-0 gap-2 bg-white text-primary-800 hover:bg-primary-50 sm:ml-auto"
				disabled={busy}
				onclick={() => void (warningFilter === 'slept' ? wake(selected) : restore(selected))}
			>
				<Undo2 size={16} />
				{warningFilter === 'slept' ? 'Wake selected' : 'Restore selected'}
			</button>
		{/if}

		<button class="btn shrink-0 text-white hover:bg-primary-800" onclick={() => (selected = [])}>
			Clear selection
		</button>
	</div>
{/if}

{#if grouped.length > 1}
	<div class="mb-2 flex justify-end gap-3 text-xs font-medium">
		<button
			class="text-primary-700 hover:underline dark:text-primary-300"
			onclick={() => setAllExpanded(true)}
		>
			Expand all
		</button>
		<button
			class="text-primary-700 hover:underline dark:text-primary-300"
			onclick={() => setAllExpanded(false)}
		>
			Collapse all
		</button>
	</div>
{/if}

<div class="space-y-4">
	{#each grouped as group (group.vendor)}
		{@const isOpen = expandedVendors.has(group.vendor)}
		{@const allSelected = group.items.every((item) => selected.includes(item.qbRow))}
		<section class="card p-0">
			<div class="flex w-full items-center gap-2 p-4">
				<button
					type="button"
					class="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-primary-700 dark:hover:text-primary-300"
					aria-expanded={isOpen}
					onclick={() => toggleVendor(group.vendor)}
				>
					<ChevronDown
						size={18}
						class="shrink-0 transition-transform {isOpen ? '' : '-rotate-90'}"
					/>
					<h2 class="h4 truncate font-semibold">{group.vendor}</h2>
					<span
						class="shrink-0 rounded-full bg-surface-200 px-2 py-0.5 text-xs tabular-nums dark:bg-surface-700"
					>
						{group.items.length}
					</span>
				</button>
				{#if canEdit}
					<button
						type="button"
						class="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-900/30"
						aria-pressed={allSelected}
						onclick={() =>
							(selected = toggleGroup(
								selected,
								group.items.map((item) => item.qbRow)
							))}
					>
						{allSelected ? 'Clear supplier' : 'Select supplier'}
					</button>
				{/if}
			</div>

			{#if isOpen}
				<div class="space-y-2 border-t border-surface-200 p-3 dark:border-surface-700">
					{#each group.items as item (item.qbRow)}
						<article
							class="rounded-lg border border-surface-200 bg-surface-50 p-3 dark:border-surface-700 dark:bg-surface-800"
						>
							<div class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
								<ItemIdentity
									name={itemName(item)}
									href={resourceHref(item)}
									qbId={item.qbId}
									upc={item.upc}
									image={item.primaryImage}
									imageDescription={item.primaryImageDescription}
									selected={selected.includes(item.qbRow)}
									onSelect={canEdit
										? (next) => (selected = toggleId(selected, item.qbRow, next))
										: undefined}
								>
									{#snippet meta()}
										{plural(item.sampleCount, 'snapshot')} over {item.spanDays.toFixed(0)} days
									{/snippet}
								</ItemIdentity>

								<QuantityTiles
									quantityOnHand={item.quantityOnHand}
									availableQuantity={item.availableQuantity}
									quantityOnPurchaseOrder={item.quantityOnPurchaseOrder}
									quantityOnSalesOrder={item.quantityOnSalesOrder}
								/>

								<InventoryChart
									history={item.history}
									current={item.availableQuantity}
									projectedStockoutAt={item.projectedStockoutAt}
									historyDays={summary.historyDays}
									seriesLabel="Available stock"
								/>

								<div class="flex min-w-0 items-start gap-2 lg:w-64 lg:shrink-0">
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-baseline gap-x-2">
											<strong
												class={item.status === 'now'
													? 'text-error-700 dark:text-error-300'
													: 'text-warning-700 dark:text-warning-300'}
											>
												{item.status === 'now' ? 'Need now' : 'Soon'}
											</strong>
											<span class="text-sm text-surface-700 dark:text-surface-200">
												{item.suggestedQuantity ?? '—'} suggested
											</span>
										</div>
										<p
											class="mt-0.5 text-xs text-surface-600 dark:text-surface-300"
											title={reorderDetail(item)}
										>
											{reorderReason(item)}
										</p>
										<p
											class="mt-0.5 text-xs {item.projectedStockoutAt !== null
												? 'font-medium text-error-700 dark:text-error-300'
												: 'text-surface-600 dark:text-surface-300'}"
										>
											{runOutLabel(item)}
										</p>
										{#if item.dismissed}
											<p class="mt-1 text-xs font-medium text-surface-600 dark:text-surface-300">
												Dismissed
											</p>
										{:else if item.snoozed && item.snoozedUntil}
											<p class="mt-1 text-xs font-medium text-surface-600 dark:text-surface-300">
												Asleep until {day(item.snoozedUntil)}
											</p>
										{/if}
									</div>

									{#if canEdit}
										<div class="flex shrink-0 items-center gap-1">
											{#if item.dismissed || item.snoozed}
												<button
													type="button"
													class="btn btn-icon btn-sm variant-soft-primary"
													aria-label={item.dismissed
														? `Restore ${itemName(item)}`
														: `Wake ${itemName(item)}`}
													disabled={busy}
													onclick={() =>
														void (item.dismissed ? restore([item.qbRow]) : wake([item.qbRow]))}
												>
													<Undo2 size={18} />
												</button>
											{:else}
												<div class="relative" data-menu-root>
													<button
														type="button"
														class="btn btn-icon btn-sm variant-soft"
														aria-label={`Sleep ${itemName(item)}`}
														aria-haspopup="menu"
														aria-expanded={openMenu === item.qbRow}
														disabled={busy}
														onclick={() => (openMenu = openMenu === item.qbRow ? null : item.qbRow)}
													>
														<Moon size={18} />
													</button>
													{#if openMenu === item.qbRow}
														<div
															class="card absolute right-0 z-30 mt-1 w-44 border border-surface-300 bg-white p-1 text-surface-900 shadow-xl dark:border-surface-600 dark:bg-surface-800 dark:text-surface-50"
															role="menu"
														>
															{#each snoozePresets as option (option.preset)}
																<button
																	class="w-full rounded px-3 py-2 text-left text-sm hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-700"
																	role="menuitem"
																	disabled={option.preset === 'stockout' &&
																		!(
																			item.projectedStockoutAt &&
																			item.projectedStockoutAt > Date.now()
																		)}
																	onclick={() => void snooze([item.qbRow], option.preset)}
																>
																	{option.label}
																</button>
															{/each}
														</div>
													{/if}
												</div>
												<button
													type="button"
													class="btn btn-icon btn-sm variant-soft-error"
													aria-label={`Dismiss warnings for ${itemName(item)}`}
													disabled={busy}
													onclick={() => void dismiss([item.qbRow])}
												>
													<Trash2 size={18} />
												</button>
											{/if}
										</div>
									{/if}
								</div>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	{:else}
		<div class="card p-10 text-center">
			<h2 class="h3 font-semibold">
				{warningFilter === 'slept'
					? 'Nothing is asleep'
					: warningFilter === 'dismissed'
						? 'Nothing is dismissed'
						: 'No matching warnings'}
			</h2>
			<p class="mt-1 text-surface-600 dark:text-surface-300">
				{#if warningFilter === 'slept' || warningFilter === 'dismissed'}
					Items you sleep or dismiss show up here so you can undo it.
				{:else}
					Try a different item or supplier filter, or clear the warning filter.
				{/if}
			</p>
			<button class="btn variant-soft-primary mt-4" onclick={clearFilters}>Clear filters</button>
		</div>
	{/each}
</div>

{#if summary.insufficient > 0}
	<p class="mt-4 text-sm text-surface-500 dark:text-surface-300">
		{summary.insufficient} items without three snapshots spanning 14 days stay out of the warning list
		until the forecast has enough evidence.
	</p>
{/if}
