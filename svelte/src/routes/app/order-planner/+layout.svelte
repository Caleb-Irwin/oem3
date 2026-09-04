<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { page } from '$app/state';
	import Boxes from 'lucide-svelte/icons/boxes';
	import ClipboardList from 'lucide-svelte/icons/clipboard-list';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import { toStore } from 'svelte/store';
	import { client, handleTRPCError, subVal } from '$lib/client';
	import { setPlannerContext } from './planner';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const plannerSub = subVal(client.orderPlanner.getSub, { init: data.orderPlanner });
	const smartOrderSummarySub = subVal(client.orderPlanner.smartOrder.summarySub, {
		init: data.smartOrderSummary
	});
	// The server load always seeds the subscription, so the planner is never in a loading state.
	const planner = $derived($plannerSub ?? data.orderPlanner);
	const smartOrderSummary = $derived($smartOrderSummarySub ?? data.smartOrderSummary);
	const canEdit = $derived(
		data.user.permissionLevel === 'general' || data.user.permissionLevel === 'admin'
	);
	const toastStore = getToastStore();

	async function assign(itemIds: number[], orderId: number | null) {
		try {
			await client.orderPlanner.assign.mutate({ itemIds, orderId });
			toastStore.trigger({
				message: orderId === null ? 'Items returned to the main list' : 'Order updated',
				background: 'variant-filled-success'
			});
		} catch (error) {
			handleTRPCError(error);
		}
	}

	setPlannerContext({
		data: toStore(() => planner),
		get canEdit() {
			return canEdit;
		},
		assign
	});

	const tabs = $derived([
		{
			href: '/app/order-planner',
			label: 'Items',
			icon: Boxes,
			unit: 'active',
			count: planner.items.filter((item) => item.orderStatus !== 'completed').length
		},
		{
			href: '/app/order-planner/orders',
			label: 'Orders',
			icon: ClipboardList,
			unit: 'open',
			count: planner.orders.filter((order) => order.status === 'draft').length
		},
		{
			href: '/app/order-planner/smart-order',
			label: 'Smart Order',
			icon: Sparkles,
			unit: 'suggestions',
			count: smartOrderSummary.now + smartOrderSummary.soon
		}
	]);
</script>

<svelte:head>
	<title>OEM3 Order Planner</title>
</svelte:head>

<div class="order-planner-route mx-auto w-full max-w-[1500px] p-4 sm:p-6">
	<div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="h3">Order Planner</h1>
			<p class="mt-1 text-sm text-surface-600 dark:text-surface-300">
				Flag low-stock items and group them into supplier orders.
			</p>
		</div>

		<nav
			class="grid w-full grid-cols-3 self-start rounded-lg bg-surface-200 p-1 dark:bg-surface-700 sm:inline-flex sm:w-auto sm:self-auto"
			aria-label="Order planner views"
		>
			{#each tabs as tab (tab.href)}
				{@const active = page.url.pathname === tab.href}
				<a
					href={tab.href}
					class="flex min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm {active
						? 'bg-surface-50 shadow-sm dark:bg-surface-800'
						: 'text-surface-600 hover:text-surface-900 dark:text-surface-300 dark:hover:text-surface-50'}"
					aria-current={active ? 'page' : undefined}
				>
					<tab.icon size={16} class="hidden sm:block" />
					<span class="whitespace-nowrap">{tab.label}</span>
					<span
						class="rounded-full px-1.5 py-0.5 text-xs tabular-nums {active
							? 'bg-surface-200 dark:bg-surface-700'
							: 'bg-surface-300/70 dark:bg-surface-800'}"
					>
						{tab.count}<span class="sr-only"> {tab.unit}</span>
					</span>
				</a>
			{/each}
		</nav>
	</div>

	{@render children()}
</div>
