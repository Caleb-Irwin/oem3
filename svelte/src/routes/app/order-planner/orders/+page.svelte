<script lang="ts">
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Plus from 'lucide-svelte/icons/plus';
	import Printer from 'lucide-svelte/icons/printer';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import Button from '$lib/Button.svelte';
	import { client, handleTRPCError } from '$lib/client';
	import SearchField from '$lib/search/SearchField.svelte';
	import CreateOrder from '../CreateOrder.svelte';
	import ItemGroupList from '../ItemGroupList.svelte';
	import OrderSidebar from '../OrderSidebar.svelte';
	import OrderStatusStepper from '../OrderStatusStepper.svelte';
	import PrintOrder from '../PrintOrder.svelte';
	import {
		getPlannerContext,
		matchesQuery,
		ordersForItem,
		statusClass,
		statusLabel,
		toggleGroup,
		toggleId
	} from '../planner';
	import type { CompletedOrder, OrderPlannerItemData, OrderPlannerOrder } from '../types';

	const HISTORY_PAGE_SIZE = 20;

	const { data: plannerStore, canEdit, assign } = getPlannerContext();
	const modalStore = getModalStore();
	const toastStore = getToastStore();

	let selectedItemIds: number[] = $state([]);
	let filter = $state('');
	let orderFilter: 'all' | 'unassigned' = $state('unassigned');
	let notes = $state('');
	let notesDirty = $state(false);
	let notesOrderId: number | null = $state(null);
	let notesServerValue = $state('');
	let savingNotes = $state(false);
	let completedOrders: CompletedOrder[] = $state([]);
	let completedItems: OrderPlannerItemData[] = $state([]);
	let completedItemsOrderId: number | null = $state(null);
	let loadingHistory = $state(false);
	let historyLoaded = $state(false);

	const data = $derived($plannerStore);

	/**
	 * The open order lives in the query string so a refresh or a shared link reopens it.
	 * A completed order past the first history page cannot be resolved, so it falls back
	 * to the default order rather than leaving the page blank.
	 */
	const openOrderId = $derived.by(() => {
		const raw = page.url.searchParams.get('order');
		const id = Number(raw);
		return raw !== null && Number.isInteger(id) && id > 0 ? id : null;
	});
	const selectedOrder = $derived(
		data.orders.find((order) => order.id === openOrderId) ??
			completedOrders.find((order) => order.id === openOrderId) ??
			null
	);

	function openOrder(id: number, replace = false) {
		const url = new URL(page.url);
		url.searchParams.set('order', String(id));
		void goto(url, { replaceState: replace, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		if (selectedOrder || data.orders.length === 0) return;
		// A completed order in the URL can only resolve once the first history page lands.
		// Past that page it stays unresolvable, so fall back rather than leave the page blank.
		if (openOrderId !== null && (loadingHistory || !historyLoaded)) return;
		const fallback =
			data.orders.find((order) => order.status === 'draft') ??
			data.orders.find((order) => order.status === 'sent') ??
			data.orders[0];
		openOrder(fallback.id, true);
	});

	// Switching orders drops a selection that belonged to the previous one.
	let selectionOrderId: number | null = null;
	$effect(() => {
		const id = selectedOrder?.id ?? null;
		if (id !== selectionOrderId) {
			selectionOrderId = id;
			selectedItemIds = [];
		}
	});

	let historyRequest = 0;

	async function loadHistory(reset = false) {
		if (reset) {
			// A reset supersedes any page load already in flight.
			historyRequest++;
		} else if (loadingHistory) {
			return;
		}
		loadingHistory = true;
		const requestId = historyRequest;
		try {
			const page = await client.orderPlanner.history.query({
				limit: HISTORY_PAGE_SIZE,
				offset: reset ? 0 : completedOrders.length
			});
			if (requestId !== historyRequest) return;
			completedOrders = reset ? page : [...completedOrders, ...page];
		} catch (error) {
			handleTRPCError(error);
		} finally {
			if (requestId === historyRequest) {
				loadingHistory = false;
				historyLoaded = true;
			}
		}
	}

	// The paged history only refreshes when the finished-order total changes,
	// e.g. right after an order is completed or sent back to draft.
	let historyLoadedForCount: number | null = null;
	$effect(() => {
		if (data.completedCount !== historyLoadedForCount) {
			historyLoadedForCount = data.completedCount;
			void loadHistory(true);
		}
	});

	// A finished order's items are fetched only when it is opened.
	$effect(() => {
		const order = selectedOrder;
		if (!order || order.status !== 'completed') {
			completedItemsOrderId = null;
			return;
		}
		if (completedItemsOrderId === order.id) return;
		completedItemsOrderId = order.id;
		completedItems = [];
		client.orderPlanner.order.items
			.query({ id: order.id })
			.then((items) => {
				if (completedItemsOrderId === order.id) completedItems = items;
			})
			.catch(handleTRPCError);
	});

	$effect(() => {
		if (!selectedOrder) {
			notes = '';
			notesOrderId = null;
			notesServerValue = '';
			notesDirty = false;
		} else if (selectedOrder.id !== notesOrderId) {
			notes = selectedOrder.notes;
			notesOrderId = selectedOrder.id;
			notesServerValue = selectedOrder.notes;
			notesDirty = false;
		} else if (selectedOrder.notes !== notesServerValue) {
			notesServerValue = selectedOrder.notes;
			if (!notesDirty) notes = selectedOrder.notes;
		}
	});

	const orderItems = $derived(
		selectedOrder === null
			? []
			: selectedOrder.status === 'completed'
				? completedItems
				: data.items.filter((item) => item.orderId === selectedOrder.id)
	);
	const availableItems = $derived.by(() => {
		if (!selectedOrder) return [];
		const query = filter.trim().toLowerCase();
		const qbRowsInOrder = new Set(
			data.items.filter((item) => item.orderId === selectedOrder.id).map((item) => item.qbRow)
		);
		// One row per product, preferring an unassigned copy over one already in another order.
		const candidates = new Map<number, OrderPlannerItemData>();
		for (const item of data.items) {
			if (item.orderStatus === 'completed' || qbRowsInOrder.has(item.qbRow)) continue;
			const existing = candidates.get(item.qbRow);
			if (!existing || (existing.orderId !== null && item.orderId === null)) {
				candidates.set(item.qbRow, item);
			}
		}
		return [...candidates.values()].filter(
			(item) =>
				!(orderFilter === 'unassigned' && item.orderId !== null) && matchesQuery(item, query)
		);
	});
	const selectedItems = $derived(
		availableItems.filter((item) => selectedItemIds.includes(item.id))
	);
	const selectedDuplicateCount = $derived(
		selectedItems.filter((item) => ordersForItem(data, item, selectedOrder?.id).length > 0).length
	);

	function openCreateOrder() {
		modalStore.trigger({
			type: 'component',
			component: {
				ref: CreateOrder,
				props: { res: (order: OrderPlannerOrder) => openOrder(order.id) }
			}
		});
	}

	async function setOrderStatus(status: OrderPlannerOrder['status']) {
		if (!selectedOrder || selectedOrder.status === status) return;
		const order = selectedOrder;
		try {
			await client.orderPlanner.order.setStatus.mutate({ id: order.id, status });
			if (status === 'completed') {
				// Bridge the gap before the history refetch lands so the order stays
				// visible in the sidebar and stays selected instead of bouncing off.
				// The spread carries the pre-mutation status, so mark it completed.
				completedOrders = [
					{ ...order, status: 'completed', itemCount: orderItems.length },
					...completedOrders.filter((completed) => completed.id !== order.id)
				];
			}
			toastStore.trigger({
				message: `Order marked ${statusLabel(status).toLowerCase()}`,
				background: 'variant-filled-success'
			});
		} catch (error) {
			handleTRPCError(error);
		}
	}

	async function saveNotes() {
		if (!selectedOrder || !notesDirty) return;
		savingNotes = true;
		try {
			await client.orderPlanner.order.setNotes.mutate({ id: selectedOrder.id, notes });
			notesDirty = false;
			toastStore.trigger({ message: 'Order notes saved', background: 'variant-filled-success' });
		} catch (error) {
			handleTRPCError(error);
		} finally {
			savingNotes = false;
		}
	}

	async function addSelectedItems() {
		if (!selectedOrder || selectedItems.length === 0) return;
		try {
			const result = await client.orderPlanner.addToOrder.mutate({
				itemIds: selectedItems.map((item) => item.id),
				orderId: selectedOrder.id
			});
			const duplicateMessage =
				result.duplicated > 0
					? ` ${result.duplicated} ${result.duplicated === 1 ? 'item was' : 'items were'} already in another order and copied.`
					: '';
			toastStore.trigger({
				message: `${result.added} ${result.added === 1 ? 'item' : 'items'} added.${duplicateMessage}`,
				background: 'variant-filled-success'
			});
			selectedItemIds = [];
		} catch (error) {
			handleTRPCError(error);
		}
	}
</script>

<div class="order-planner-page">
	<div class="screen-order-planner grid min-w-0 gap-4 lg:grid-cols-[270px_minmax(0,1fr)]">
		<div class="h-fit space-y-4">
			{#if canEdit}
				<button
					class="btn variant-filled-primary w-full justify-center gap-2 py-3"
					onclick={openCreateOrder}
				>
					<Plus size={19} />
					Create a new order
				</button>
			{/if}

			<OrderSidebar
				{data}
				completed={completedOrders}
				{loadingHistory}
				pageSize={HISTORY_PAGE_SIZE}
				selectedOrderId={selectedOrder?.id ?? null}
				onSelect={(id) => openOrder(id)}
				onLoadMore={() => loadHistory()}
			/>
		</div>

		<section class="min-w-0">
			{#if selectedOrder}
				<div class="card mb-4 p-4">
					<div class="flex items-start gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="h3 truncate font-semibold">{selectedOrder.name}</h2>
								<span class="badge {statusClass(selectedOrder.status)}">
									{statusLabel(selectedOrder.status)}
								</span>
							</div>
							<p class="mt-1 text-sm text-surface-600 dark:text-surface-300">
								Created by {selectedOrder.createdBy} · {orderItems.length}
								{orderItems.length === 1 ? 'item' : 'items'}
							</p>
						</div>

						<button
							class="btn variant-soft-primary shrink-0 gap-2"
							onclick={() => window.print()}
							title="Print this order or save it as a PDF"
						>
							<Printer size={17} />
							Print
						</button>

						{#if canEdit && selectedOrder.status === 'draft'}
							<Button
								action={client.orderPlanner.order.delete}
								input={{ id: selectedOrder.id }}
								confirm="Delete this open order? Its items will return to the unassigned list."
								successMessage="Order deleted"
								class="btn btn-icon shrink-0 variant-ghost-error"
							>
								<Trash2 size={18} />
								<span class="sr-only">Delete order</span>
							</Button>
						{/if}
					</div>

					<div class="mt-4 border-t border-surface-200 pt-4 dark:border-surface-700">
						<h3 class="font-semibold">Order notes</h3>
						<p class="mt-0.5 text-sm text-surface-600 dark:text-surface-300">
							Store reference numbers, vendor contacts, and delivery details here.
						</p>
						{#if canEdit}
							<textarea
								class="textarea mt-2 min-h-24 w-full resize-y"
								maxlength="4000"
								placeholder="Add notes about this order"
								value={notes}
								oninput={(event) => {
									notes = event.currentTarget.value;
									notesDirty = notes !== selectedOrder?.notes;
								}}
							></textarea>
							<div class="mt-2 flex items-center justify-end gap-3">
								{#if notesDirty}
									<span class="text-xs text-warning-700 dark:text-warning-300">Unsaved changes</span
									>
								{/if}
								<button
									class="btn variant-filled-primary"
									disabled={!notesDirty || savingNotes}
									onclick={saveNotes}
								>
									{savingNotes ? 'Saving…' : 'Save notes'}
								</button>
							</div>
						{:else if selectedOrder.notes}
							<p
								class="mt-2 whitespace-pre-wrap rounded-md bg-surface-100 p-3 text-sm dark:bg-surface-700"
							>
								{selectedOrder.notes}
							</p>
						{:else}
							<p class="mt-2 text-sm italic text-surface-500">No notes for this order.</p>
						{/if}
					</div>

					{#if canEdit}
						<OrderStatusStepper status={selectedOrder.status} onChange={setOrderStatus} />
					{/if}
				</div>

				<section class="mb-6">
					<h3
						class="mb-2 text-sm font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-300"
					>
						Items in this order
					</h3>
					<ItemGroupList
						items={orderItems}
						orders={data.orders}
						{canEdit}
						onAssign={assign}
						duplicateOrdersFor={(item) => ordersForItem(data, item, selectedOrder.id)}
						variant="nested"
						empty={emptyOrder}
					/>
				</section>

				{#if selectedOrder.status !== 'completed'}
					<section>
						<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
							<h3
								class="min-w-fit text-sm font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-300"
							>
								Add low-stock items
							</h3>
							<div class="min-w-0 flex-1">
								<SearchField
									queryType="qb"
									queryTypes={['qb']}
									placeholder="Filter available items"
									ariaLabel="Filter available low-stock items"
									showSubmitButton={false}
									bind:query={filter}
								/>
							</div>
							<label class="shrink-0">
								<span class="sr-only">Filter available items by order</span>
								<select class="select min-h-10 w-full sm:w-44" bind:value={orderFilter}>
									<option value="all">All low-stock items</option>
									<option value="unassigned">Not in an order</option>
								</select>
							</label>
						</div>

						{#if selectedItems.length > 0 && canEdit}
							<div
								class="sticky top-2 z-10 mb-2 flex items-center justify-between gap-3 rounded-lg bg-primary-700 p-2.5 text-white shadow-lg"
							>
								<span class="font-medium">
									{selectedItems.length} selected
									{#if selectedDuplicateCount > 0}
										· {selectedDuplicateCount} already in another order
									{/if}
								</span>
								<button
									class="btn bg-white text-primary-800 hover:bg-primary-50"
									onclick={addSelectedItems}
								>
									Add to {selectedOrder.name}
								</button>
							</div>
						{/if}

						<ItemGroupList
							items={availableItems}
							orders={data.orders}
							{canEdit}
							onAssign={assign}
							duplicateOrdersFor={(item) => ordersForItem(data, item, selectedOrder.id)}
							showRemove={false}
							variant="nested"
							selection={{
								ids: selectedItemIds,
								onToggle: (id, selected) =>
									(selectedItemIds = toggleId(selectedItemIds, id, selected)),
								onToggleGroup: (items) =>
									(selectedItemIds = toggleGroup(
										selectedItemIds,
										items.map((item) => item.id)
									))
							}}
							empty={emptyAvailable}
						/>
					</section>
				{/if}
			{:else}
				<div class="card p-10 text-center">
					<h2 class="h3 font-semibold">No orders yet</h2>
					<p class="mt-1 text-surface-600 dark:text-surface-300">
						Create an order to start collecting low-stock items.
					</p>
				</div>
			{/if}
		</section>
	</div>

	{#if selectedOrder}
		<PrintOrder order={selectedOrder} items={orderItems} {notes} />
	{/if}
</div>

{#snippet emptyOrder()}
	<div
		class="rounded-lg border border-dashed border-surface-300 p-7 text-center text-surface-600 dark:border-surface-600 dark:text-surface-300"
	>
		This order is empty.
	</div>
{/snippet}

{#snippet emptyAvailable()}
	<div
		class="rounded-lg border border-dashed border-surface-300 p-7 text-center text-surface-600 dark:border-surface-600 dark:text-surface-300"
	>
		{#if filter.trim()}
			No matching items.
		{:else if orderFilter === 'unassigned'}
			Every low-stock item is already in an order. Choose "All low-stock items" to add one to this
			order as well.
		{:else}
			Every low-stock item is already in this order.
		{/if}
	</div>
{/snippet}
