<script lang="ts">
	import { getModalStore, getToastStore } from '@skeletonlabs/skeleton';
	import ClipboardCopy from 'lucide-svelte/icons/clipboard-copy';
	import X from 'lucide-svelte/icons/x';
	import { quickBooksPurchaseOrderHtml, quickBooksPurchaseOrderTsv } from './planner';
	import type { OrderPlannerItemData, OrderPlannerOrder } from './types';

	interface Props {
		order: OrderPlannerOrder;
		items: OrderPlannerItemData[];
	}

	let { order, items }: Props = $props();
	const modalStore = getModalStore();
	const toastStore = getToastStore();
	const tsv = $derived(quickBooksPurchaseOrderTsv(items));
	let copying = $state(false);

	async function copyItems() {
		if (!tsv || copying) return;
		copying = true;
		try {
			if ('ClipboardItem' in window && navigator.clipboard.write) {
				await navigator.clipboard.write([
					new ClipboardItem({
						'text/plain': new Blob([tsv], { type: 'text/plain' }),
						'text/html': new Blob([quickBooksPurchaseOrderHtml(items)], { type: 'text/html' })
					})
				]);
			} else {
				await navigator.clipboard.writeText(tsv);
			}
			toastStore.trigger({
				message: `${items.length} ${items.length === 1 ? 'item' : 'items'} copied for QuickBooks`,
				background: 'variant-filled-success'
			});
			modalStore.close();
		} catch {
			toastStore.trigger({
				message: 'Could not copy the items. Select the text and copy it manually.',
				background: 'variant-filled-error'
			});
		} finally {
			copying = false;
		}
	}
</script>

<div class="card w-[calc(100vw-2rem)] max-w-lg p-4">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h2 class="h3 font-semibold">Export {order.name}</h2>
			<p class="mt-1 text-sm text-surface-600 dark:text-surface-300">
				Choose an export format for this order.
			</p>
		</div>
		<button
			class="btn btn-icon variant-ghost"
			aria-label="Close export dialog"
			onclick={() => modalStore.close()}
		>
			<X size={18} />
		</button>
	</div>

	<div
		class="mt-5 flex w-full items-start gap-3 rounded-lg border border-primary-300 bg-primary-50 p-3 text-left dark:border-primary-700 dark:bg-primary-900/30"
		aria-label="Selected export format: QuickBooks purchase order"
	>
		<ClipboardCopy class="mt-0.5 shrink-0 text-primary-700 dark:text-primary-300" size={20} />
		<span class="min-w-0">
			<strong class="block">QuickBooks purchase order</strong>
			<span class="mt-0.5 block text-sm text-surface-600 dark:text-surface-300">
				Copy an Excel-style item table for pasting into QuickBooks Desktop Enterprise.
			</span>
		</span>
	</div>

	<div class="mt-4">
		<div class="flex items-center justify-between gap-2">
			<label for="quickbooks-order-items" class="text-sm font-medium">Items to copy</label>
			<span class="text-xs text-surface-500"
				>{items.length} {items.length === 1 ? 'item' : 'items'}</span
			>
		</div>
		<textarea
			id="quickbooks-order-items"
			class="textarea mt-1 h-32 w-full resize-y font-mono text-sm"
			readonly
			value={tsv}
			aria-label="QuickBooks item TSV"
		></textarea>
		<p class="mt-1 text-xs text-surface-500 dark:text-surface-400">
			Only item numbers are included. Supplier and quantity are left for QuickBooks. This copies
			spreadsheet-style rows and plain text for compatibility with Windows.
		</p>
	</div>

	<div class="mt-4 flex justify-end gap-2">
		<button class="btn variant-ghost" onclick={() => modalStore.close()}>Cancel</button>
		<button
			class="btn variant-filled-primary gap-2"
			disabled={items.length === 0 || copying}
			onclick={copyItems}
		>
			<ClipboardCopy size={17} />
			{copying ? 'Copying…' : 'Copy item table'}
		</button>
	</div>
</div>
