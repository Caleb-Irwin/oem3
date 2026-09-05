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
	const commonPackCounts = Array.from({ length: 120 }, (_, index) => index + 1).filter(
		(count) => count === 2 || count % 3 === 0 || count % 5 === 0
	);
	const quickPackCounts = [2, 3, 5, 6, 10, 12, 15, 20, 24, 30];
	function nearestPackCount(value: number) {
		return commonPackCounts.reduce((nearest, count) =>
			Math.abs(count - value) < Math.abs(nearest - value) ? count : nearest
		);
	}

	function estimatedPackCount(estimatedDirection: 'multiply' | 'divide', fallbackCount: number) {
		if (item.onlinePriceCents === null || item.onlinePriceCents <= 0 || item.currentPriceCents <= 0)
			return nearestPackCount(fallbackCount);
		const priceRatio =
			estimatedDirection === 'multiply'
				? item.currentPriceCents / item.onlinePriceCents
				: item.onlinePriceCents / item.currentPriceCents;
		return nearestPackCount(priceRatio);
	}

	const configuredDirection = item.sourceToQuickBooksFactor < 1 ? 'divide' : 'multiply';
	const priceDirection =
		item.onlinePriceCents !== null && item.currentPriceCents < item.onlinePriceCents
			? 'divide'
			: 'multiply';
	const suggestedDirection =
		item.conversionSuggestion.direction === 'none'
			? priceDirection
			: item.conversionSuggestion.direction;
	const initialDirection = item.unitConversionConfigured ? configuredDirection : suggestedDirection;
	const configuredPackCount = nearestPackCount(
		initialDirection === 'divide'
			? 1 / item.sourceToQuickBooksFactor
			: item.sourceToQuickBooksFactor
	);
	const initialPackCount = item.unitConversionConfigured
		? configuredPackCount
		: estimatedPackCount(initialDirection, item.conversionSuggestion.packCount ?? 12);

	let direction = $state<'multiply' | 'divide'>(initialDirection);
	let packCount = $state(initialPackCount);
	let factor = $derived(conversionFactor(direction, packCount));
	let adjustmentPercent = $state(
		item.unitConversionConfigured
			? item.quickBooksConversionAdjustmentPercent
			: defaultAdjustment(initialDirection)
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
	}

	function conversionFactor(nextDirection: 'multiply' | 'divide', nextCount: number) {
		return nextDirection === 'multiply' ? nextCount : 1 / nextCount;
	}

	function defaultAdjustment(defaultDirection: 'multiply' | 'divide') {
		return defaultDirection === 'multiply' ? -10 : 10;
	}

	function unitLabel(value: string | null) {
		return value?.toUpperCase() ?? 'Unknown';
	}
</script>

<div
	class="card flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-xl flex-col gap-4 overflow-y-auto p-4 sm:p-5"
>
	<PriceChangeIdentity {item} />

	<div
		class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-surface-200 bg-surface-100/70 p-3 text-center dark:border-surface-700 dark:bg-surface-800/70"
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

	<Form
		action={client.priceChanges.setUnitConversion}
		input={{ productRow: item.productRow }}
		modalMode
		noReset
		class="unit-conversion-form !max-w-none !rounded-none !border-0 !bg-transparent !p-0 !shadow-none"
		successMessage="U/M conversion saved"
	>
		<div class="w-full space-y-4">
			<input type="hidden" name="factor" value={factor} />
			<div class="rounded-xl border border-surface-200 p-3 dark:border-surface-700">
				<div>
					<p class="text-sm font-bold">Pack relationship</p>
					<p class="text-xs text-surface-500 dark:text-surface-400">
						Choose which system contains the pack.
					</p>
				</div>
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

				<div class="mt-3">
					<label
						for="pack-count"
						class="text-xs font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400"
					>
						Pack count
					</label>
					<div class="mt-1.5 flex flex-wrap gap-1.5">
						{#each quickPackCounts as count}
							<button
								type="button"
								class="btn btn-sm {packCount === count ? 'variant-ghost-primary' : 'variant-ghost'}"
								onclick={() => applyPackCount(count)}
							>
								{count}
							</button>
						{/each}
						<select
							id="pack-count"
							class="select w-24 py-1 text-sm"
							aria-label="More pack counts"
							bind:value={packCount}
							onchange={() => applyPackCount()}
						>
							{#each commonPackCounts as count}
								<option value={count}>{count}</option>
							{/each}
						</select>
					</div>
					<p class="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
						Only preset counts are available. The initial count is the closest match for the source
						and QuickBooks prices.
					</p>
				</div>
			</div>

			<div class="rounded-xl bg-surface-100 p-3 dark:bg-surface-800">
				<div class="flex items-center justify-between gap-3 text-sm">
					<span>Conversion factor</span>
					<strong>×{factor.toLocaleString(undefined, { maximumFractionDigits: 6 })}</strong>
				</div>
				<label class="label mt-3">
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
				<p class="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
					Defaults to {defaultAdjustment(direction) > 0 ? '+' : ''}{defaultAdjustment(direction)}%
					for this direction. You can fine-tune it.
				</p>
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
