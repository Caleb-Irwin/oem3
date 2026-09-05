<script lang="ts">
	import { getModalStore } from '@skeletonlabs/skeleton';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import Button from '$lib/Button.svelte';
	import Form from '$lib/Form.svelte';
	import { client } from '$lib/client';
	import { formatPrice } from '$lib/formatPrice';
	import PriceChangeIdentity from './PriceChangeIdentity.svelte';
	import type { PriceChangeItem } from './types';

	interface Props {
		item: PriceChangeItem;
	}

	let { item }: Props = $props();

	const modalStore = getModalStore();
	const commonPackCounts = Array.from(
		new Set([
			2,
			3,
			5,
			...Array.from({ length: 20 }, (_, index) => (index + 1) * 6),
			...Array.from({ length: 12 }, (_, index) => (index + 1) * 10)
		])
	).sort((a, b) => a - b);
	const quickPackCounts = [2, 3, 5, 10, 12, 20, 24];
	const suggestedDirection =
		item.conversionSuggestion.direction === 'none'
			? 'multiply'
			: item.conversionSuggestion.direction;
	const useSuggestion =
		!item.unitConversionConfigured && item.conversionSuggestion.direction !== 'none';

	let direction = $state<'multiply' | 'divide'>(suggestedDirection);
	let packCount = $state(item.conversionSuggestion.packCount ?? 12);
	let factor = $state(
		useSuggestion ? item.conversionSuggestion.factor : item.sourceToQuickBooksFactor
	);
	let adjustmentPercent = $state(
		item.unitConversionConfigured
			? item.quickBooksConversionAdjustmentPercent
			: defaultAdjustment(suggestedDirection)
	);

	const previewPriceCents = $derived.by(() => {
		if (
			item.onlinePriceCents === null ||
			!Number.isFinite(factor) ||
			!Number.isFinite(adjustmentPercent)
		)
			return null;
		if (item.onlinePriceCents === 0) return 0;
		const converted = item.onlinePriceCents * factor * (1 + adjustmentPercent / 100);
		return Math.ceil(converted / 10) * 10 - 1;
	});

	function applyPackCount(nextCount = packCount, nextDirection = direction) {
		if (nextDirection !== direction && adjustmentPercent === defaultAdjustment(direction)) {
			adjustmentPercent = defaultAdjustment(nextDirection);
		}
		packCount = nextCount;
		direction = nextDirection;
		factor = nextDirection === 'multiply' ? nextCount : 1 / nextCount;
	}

	function defaultAdjustment(conversionDirection: 'multiply' | 'divide') {
		return conversionDirection === 'divide' ? 15 : -15;
	}

	function unitLabel(value: string | null) {
		return value?.toUpperCase() ?? 'Unknown';
	}
</script>

<div class="card flex w-[calc(100vw-2rem)] max-w-xl flex-col gap-4 p-4">
	<PriceChangeIdentity {item} />

	<div
		class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-lg bg-surface-100 p-3 text-center dark:bg-surface-800"
	>
		<div>
			<p class="text-xs font-semibold uppercase tracking-wide text-surface-500">
				{item.source === 'guild' ? 'Guild' : 'Novexco'}
			</p>
			<p class="text-lg font-bold">{unitLabel(item.sourceUm)}</p>
		</div>
		<ArrowRight size={20} class="text-surface-400" />
		<div>
			<p class="text-xs font-semibold uppercase tracking-wide text-surface-500">QuickBooks</p>
			<p class="text-lg font-bold">{unitLabel(item.quickBooksUm)}</p>
		</div>
	</div>

	{#if item.conversionSuggestion.direction !== 'none'}
		<div
			class="rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-900/20"
		>
			<p class="text-sm font-semibold">Suggested U/M fix</p>
			<p class="pt-0.5 text-sm text-surface-600 dark:text-surface-300">
				{item.conversionSuggestion.direction === 'multiply'
					? `${item.conversionSuggestion.packCount} source units make 1 QuickBooks unit.`
					: `1 source unit contains ${item.conversionSuggestion.packCount} QuickBooks units.`}
			</p>
		</div>
	{/if}

	<Form
		action={client.priceChanges.setUnitConversion}
		input={{ productRow: item.productRow }}
		modalMode
		noReset
		class="unit-conversion-form !max-w-none !rounded-none !border-0 !bg-transparent !p-0 !shadow-none"
		successMessage="U/M conversion saved"
	>
		<div class="w-full space-y-4">
			<div>
				<p class="text-sm font-bold">Build a factor from a pack count</p>
				<div class="mt-2 grid gap-2 sm:grid-cols-2">
					<button
						type="button"
						class="btn h-auto min-h-12 whitespace-normal text-left {direction === 'multiply'
							? 'variant-filled-primary'
							: 'variant-ghost'}"
						onclick={() => applyPackCount(packCount, 'multiply')}
					>
						{packCount} source = 1 QuickBooks
					</button>
					<button
						type="button"
						class="btn h-auto min-h-12 whitespace-normal text-left {direction === 'divide'
							? 'variant-filled-primary'
							: 'variant-ghost'}"
						onclick={() => applyPackCount(packCount, 'divide')}
					>
						1 source = {packCount} QuickBooks
					</button>
				</div>

				<div class="mt-2 flex flex-wrap gap-1.5">
					{#each quickPackCounts as count}
						<button
							type="button"
							class="btn btn-sm {packCount === count ? 'variant-ghost-primary' : 'variant-ghost'}"
							onclick={() => applyPackCount(count)}
						>
							{count}
						</button>
					{/each}
					<label class="flex items-center gap-1.5 text-sm">
						<span>More</span>
						<select class="select py-1" bind:value={packCount} onchange={() => applyPackCount()}>
							{#each commonPackCounts as count}
								<option value={count}>{count}</option>
							{/each}
						</select>
					</label>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<label class="label">
					<span class="font-bold">Source-to-QuickBooks factor</span>
					<input
						class="input"
						type="number"
						name="factor"
						min="0.000001"
						max="1000000"
						step="any"
						required
						bind:value={factor}
					/>
				</label>
				<label class="label">
					<span class="font-bold">Conversion adjustment</span>
					<div class="input-group grid-cols-[minmax(0,1fr)_auto]">
						<input
							class="min-w-0 bg-transparent text-right outline-none"
							type="number"
							name="adjustmentPercent"
							min="-99.999"
							max="100000"
							step="any"
							required
							bind:value={adjustmentPercent}
						/>
						<div class="input-group-shim">%</div>
					</div>
				</label>
			</div>

			<p class="text-sm text-surface-600 dark:text-surface-300">
				A negative adjustment makes a pack cheaper per item. The converted price is rounded up to
				the next 10 cents, then reduced by 1 cent.
			</p>

			<div class="rounded-lg bg-surface-100 p-3 dark:bg-surface-800">
				<div class="flex items-center justify-between gap-3 text-sm">
					<span>Source price</span>
					<strong
						>{item.onlinePriceCents === null
							? 'Unset'
							: formatPrice(item.onlinePriceCents / 100)}</strong
					>
				</div>
				<div
					class="mt-2 flex items-center justify-between gap-3 border-t border-surface-200 pt-2 dark:border-surface-700"
				>
					<span class="font-semibold">New QuickBooks target</span>
					<strong class="text-lg text-primary-700 dark:text-primary-300">
						{previewPriceCents === null ? 'Unset' : formatPrice(previewPriceCents / 100)}
					</strong>
				</div>
			</div>

			<button class="btn w-full variant-filled-primary">
				{item.unitConversionConfigured ? 'Update U/M conversion' : 'Save U/M conversion'}
			</button>
		</div>
	</Form>

	{#if item.unitConversionConfigured}
		<div
			class="flex items-center justify-between gap-3 border-t border-surface-200 pt-3 text-sm dark:border-surface-700"
		>
			<span class="text-surface-600 dark:text-surface-300"
				>Reset to factor 1 with no adjustment</span
			>
			<Button
				class="btn btn-sm variant-ghost-error"
				action={client.priceChanges.resetUnitConversion}
				input={{ productRow: item.productRow }}
				res={() => modalStore.close()}
				successMessage="U/M conversion removed"
			>
				Reset
			</Button>
		</div>
	{/if}
</div>

<style>
	:global(form.unit-conversion-form) {
		box-shadow: none !important;
	}

	:global(form.unit-conversion-form > fieldset) {
		margin: 0;
		width: 100%;
		border: 0;
		padding: 0;
	}
</style>
