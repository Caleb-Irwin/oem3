<script lang="ts">
	import type { OrderPlannerItemData, OrderPlannerOrder } from './types';

	interface Props {
		order: OrderPlannerOrder;
		items: OrderPlannerItemData[];
		notes: string;
	}

	let { order, items, notes }: Props = $props();

	function statusLabel(status: OrderPlannerOrder['status']) {
		return status === 'draft' ? 'Open' : status === 'sent' ? 'Sent' : 'Completed';
	}

	function groups(items: OrderPlannerItemData[]) {
		const grouped = new Map<string, OrderPlannerItemData[]>();
		for (const item of items) {
			const vendor = item.vendor || 'No preferred vendor';
			grouped.set(vendor, [...(grouped.get(vendor) ?? []), item]);
		}
		return [...grouped.entries()]
			.map(([vendor, vendorItems]) => ({ vendor, items: vendorItems }))
			.sort((a, b) => a.vendor.localeCompare(b.vendor));
	}
</script>

<section class="print-order" aria-label="Printable order">
	<header class="print-order-header">
		<div>
			<h1>{order.name}</h1>
			<p>{items.length} {items.length === 1 ? 'item' : 'items'}</p>
		</div>
		<p class="print-order-status">{statusLabel(order.status)}</p>
	</header>

	{#if notes.trim()}
		<div class="print-order-note">
			<strong>Note</strong>
			<span>{notes}</span>
		</div>
	{/if}

	<div class="print-order-items">
		{#each groups(items) as group (group.vendor)}
			<section class="print-vendor">
				<h2>{group.vendor}</h2>
				{#each group.items as item (item.id)}
					<div class="print-item">
						<div class="print-item-name">
							<strong>{item.qbId}</strong>
							{#if item.description && item.description !== item.productName}
								<span>{item.description}</span>
							{/if}
						</div>
						<div class="print-item-upc">UPC {item.upc || '—'}</div>
					</div>
				{/each}
			</section>
		{:else}
			<p>No items in this order.</p>
		{/each}
	</div>
</section>

<style>
	.print-order {
		display: none;
	}

	@media print {
		@page {
			margin: 0.15in 0.25in;
		}

		:global(html),
		:global(body),
		:global(#appShell),
		:global(#appShell > div),
		:global(#page),
		:global(#page-content) {
			background: white !important;
			display: block !important;
			height: auto !important;
			min-height: 0 !important;
			overflow: visible !important;
			padding: 0 !important;
			position: static !important;
		}

		:global(#shell-header),
		:global(#shell-footer),
		:global(.order-planner-route > :not(.order-planner-page)) {
			display: none !important;
		}

		:global(.order-planner-route) {
			margin: 0 !important;
			max-width: none !important;
			padding: 0 !important;
		}

		:global(body *) {
			visibility: hidden;
		}

		:global(.order-planner-page),
		.print-order,
		.print-order * {
			visibility: visible;
		}

		:global(.screen-order-planner) {
			display: none;
		}

		.print-order {
			color: #111;
			display: block;
			font-family: Arial, sans-serif;
			font-size: 10pt;
			line-height: 1.25;
			margin: 0;
			padding: 0;
		}

		.print-order-header {
			align-items: baseline;
			border-bottom: 2px solid #111;
			display: flex;
			justify-content: space-between;
			margin-bottom: 0.06in;
			padding-bottom: 0.04in;
		}

		.print-order-header h1 {
			font-size: 17pt;
			margin: 0;
		}

		.print-order-header p {
			margin: 0.03in 0 0;
		}

		.print-order-status {
			font-size: 9pt;
			text-transform: uppercase;
		}

		.print-order-note {
			border-bottom: 1px solid #999;
			display: flex;
			gap: 0.08in;
			padding: 0.04in 0 0.1in;
			white-space: pre-wrap;
		}

		.print-vendor {
			margin-top: 0.13in;
		}

		.print-vendor h2 {
			border-bottom: 1px solid #999;
			font-size: 10pt;
			margin: 0;
			padding: 0.03in 0;
		}

		.print-item {
			border-bottom: 1px solid #ddd;
			break-inside: avoid;
			display: table;
			page-break-inside: avoid;
			table-layout: fixed;
			width: 100%;
		}

		.print-item,
		.print-item-name,
		.print-item-upc {
			break-before: auto;
			break-after: auto;
		}

		.print-item-name,
		.print-item-upc {
			display: table-cell;
			padding: 0.055in 0;
			vertical-align: top;
		}

		.print-item-name {
			width: calc(100% - 1.6in);
		}

		.print-item-name span {
			display: block;
			font-size: 9pt;
		}

		.print-item-upc {
			font-family: monospace;
			font-size: 9pt;
			text-align: right;
			width: 1.6in;
		}
	}
</style>
