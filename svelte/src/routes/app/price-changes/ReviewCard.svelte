<script lang="ts">
	import Check from 'lucide-svelte/icons/check';
	import X from 'lucide-svelte/icons/x';
	import ArrowDown from 'lucide-svelte/icons/arrow-down';
	import ArrowUp from 'lucide-svelte/icons/arrow-up';
	import Pencil from 'lucide-svelte/icons/pencil';
	import PackageOpen from 'lucide-svelte/icons/package-open';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import Undo2 from 'lucide-svelte/icons/undo-2';
	import PriceBreakdown from '../price/PriceBreakdown.svelte';
	import PriceChangeIdentity from './PriceChangeIdentity.svelte';
	import PriceMove from './PriceMove.svelte';
	import type { PriceChangeItem } from './types';

	interface Props {
		item: PriceChangeItem;
		decision: 'approve' | 'reject' | undefined;
		canGoBack: boolean;
		canGoForward: boolean;
		busy: boolean;
		approve: () => void;
		reject: () => void;
		back: () => void;
		forward: () => void;
		undo: () => void;
		editPrice: () => void;
		editUnitConversion: () => void;
	}

	let {
		item,
		decision,
		canGoBack,
		canGoForward,
		busy,
		approve,
		reject,
		back,
		forward,
		undo,
		editPrice,
		editUnitConversion
	}: Props = $props();

	const unitMeasures = $derived([
		{ label: 'QuickBooks', value: item.quickBooksUm },
		{ label: 'Unified', value: item.um },
		{ label: 'Guild', value: item.guildUm },
		{ label: 'SPR', value: item.sprUm }
	]);
	const hasDifferentUnitMeasures = $derived(
		new Set(
			unitMeasures
				.map(({ value }) => value?.trim().toLowerCase())
				.filter((value): value is string => Boolean(value))
		).size > 1
	);
</script>

<div
	class="card flex flex-col gap-3 border-2 p-4 {decision === 'approve'
		? 'border-success-500 bg-success-50/40 dark:bg-success-900/10'
		: decision === 'reject'
			? 'border-error-500 bg-error-50/40 dark:bg-error-900/10'
			: ''}"
>
	<!-- Small screens stack the price under the title; wide screens keep it on the row and
		wrap the title instead, since it clamps to two lines. -->
	<div class="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-6">
		<div class="min-w-0 sm:flex-1">
			<PriceChangeIdentity {item} size="lg" showUnifiedTitle />
		</div>
		<div class="shrink-0">
			<PriceMove
				currentPriceCents={item.currentPriceCents}
				targetPriceCents={item.targetPriceCents}
				changePercent={item.changePercent}
				size="lg"
			/>
		</div>
	</div>

	{#if decision}
		<div
			class="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 {decision === 'approve'
				? 'border-success-300 bg-success-50 text-success-800 dark:border-success-700 dark:bg-success-900/25 dark:text-success-200'
				: 'border-error-300 bg-error-50 text-error-800 dark:border-error-700 dark:bg-error-900/25 dark:text-error-200'}"
			role="status"
		>
			<span
				class="grid h-8 w-8 shrink-0 place-content-center rounded-full {decision === 'approve'
					? 'bg-success-500/20'
					: 'bg-error-500/20'}"
			>
				{#if decision === 'approve'}
					<Check size={16} />
				{:else}
					<X size={16} />
				{/if}
			</span>
			<div class="min-w-0 flex-grow">
				<p class="font-semibold">
					Previously {decision === 'approve' ? 'approved' : 'rejected'}{item.decidedBy
						? ` by ${item.decidedBy}`
						: ''}
				</p>
				<p class="text-xs opacity-80">
					It sits in the <strong>{decision === 'approve' ? 'Approved' : 'Rejected'}</strong> list
					{decision === 'approve' ? ', ready to export' : ' until the target price moves'}.
				</p>
			</div>
			<div class="flex shrink-0 flex-wrap gap-1.5">
				<button class="btn btn-sm variant-ghost" onclick={undo} disabled={busy}>
					<Undo2 size={15} /><span class="pl-1">Undo</span>
				</button>
				<button
					class="btn btn-sm whitespace-nowrap {decision === 'approve'
						? 'variant-ghost-success'
						: 'variant-ghost-error'}"
					onclick={forward}
					disabled={!canGoForward || busy}
				>
					Keep and continue <ArrowDown size={16} />
				</button>
			</div>
		</div>
	{/if}

	<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-600 dark:text-surface-300">
		<span
			>QuickBooks item <strong class="text-surface-900 dark:text-surface-50">{item.qbId}</strong
			></span
		>
		{#if item.unitConversionConfigured}
			<span>
				Conversion <strong class="text-surface-900 dark:text-surface-50">
					×{item.sourceToQuickBooksFactor.toLocaleString(undefined, {
						maximumFractionDigits: 6
					})}
					· {item.quickBooksConversionAdjustmentPercent > 0
						? '+'
						: ''}{item.quickBooksConversionAdjustmentPercent}%
				</strong>
			</span>
		{/if}
		<span>
			On hand <strong class="text-surface-900 dark:text-surface-50">
				{item.localInventory ?? '—'}
			</strong>
		</span>
		{#if item.preferredVendor}
			<span
				>Vendor <strong class="text-surface-900 dark:text-surface-50">{item.preferredVendor}</strong
				></span
			>
		{/if}
	</div>

	{#if hasDifferentUnitMeasures}
		<div
			class="flex gap-2.5 rounded-lg border border-warning-300 bg-warning-50 px-3 py-2.5 text-warning-900 dark:border-warning-700 dark:bg-warning-900/20 dark:text-warning-100"
		>
			<TriangleAlert size={19} class="mt-0.5 shrink-0" />
			<div class="min-w-0">
				<p class="font-semibold">Different U/Ms</p>
				<p class="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
					{#each unitMeasures as unit}
						{#if unit.value}
							<span>{unit.label} <strong>{unit.value.toUpperCase()}</strong></span>
						{/if}
					{/each}
				</p>
			</div>
		</div>
	{/if}

	<PriceBreakdown
		customPriceCents={item.targetPriceCents}
		guildPriceCents={item.guildPriceCents}
		novexcoPriceCents={item.novexcoPriceCents}
		quickBooksPriceCents={item.currentPriceCents}
		guildCostCents={item.guildCostCents}
		novexcoCostCents={item.novexcoCostCents}
		quickBooksCostCents={item.quickBooksCostCents}
		guildUm={item.guildUm}
		novexcoUm={item.sprUm}
		quickBooksUm={item.quickBooksUm}
		open
	/>

	<div class="grid grid-cols-2 gap-2 md:grid-cols-5">
		<button
			class="btn {decision === 'reject' ? 'variant-filled-error' : 'variant-ghost-error'}"
			onclick={reject}
			disabled={busy}
		>
			<X size={18} /><span class="pl-1">Reject</span>
		</button>
		<button class="btn variant-ghost" onclick={back} disabled={!canGoBack || busy}>
			<ArrowUp size={18} /><span class="pl-1">Previous</span>
		</button>
		<button class="btn variant-ghost-secondary" onclick={editPrice} disabled={busy}>
			<Pencil size={18} /><span class="pl-1">Custom price</span>
		</button>
		<button class="btn variant-ghost-secondary" onclick={editUnitConversion} disabled={busy}>
			<PackageOpen size={18} /><span class="pl-1">U/M conversion</span>
		</button>
		<button
			class="btn {decision === 'approve' ? 'variant-filled-success' : 'variant-ghost-success'}"
			onclick={approve}
			disabled={busy}
		>
			<Check size={18} /><span class="pl-1">Approve</span>
		</button>
	</div>

	<p class="text-center text-xs text-surface-500 dark:text-surface-400">
		← reject · ↑ previous · → approve
		{#if decision}
			<span class="pl-2 font-semibold">· ↓ keep previous decision and continue</span>
		{/if}
	</p>
</div>
