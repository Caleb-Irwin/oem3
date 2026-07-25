<script lang="ts">
	import { formatPrice } from '$lib/formatPrice';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';

	interface Props {
		customPriceCents: number | null;
		guildPriceCents: number | null;
		novexcoPriceCents: number | null;
		quickBooksPriceCents: number | null;
		guildCostCents: number | null;
		novexcoCostCents: number | null;
		quickBooksCostCents: number | null;
		open?: boolean;
		compact?: boolean;
	}

	let {
		customPriceCents,
		guildPriceCents,
		novexcoPriceCents,
		quickBooksPriceCents,
		guildCostCents,
		novexcoCostCents,
		quickBooksCostCents,
		open = false,
		compact = false
	}: Props = $props();

	const sources = $derived([
		{ label: 'Guild', price: guildPriceCents, cost: guildCostCents },
		{ label: 'Novexco', price: novexcoPriceCents, cost: novexcoCostCents },
		{ label: 'QuickBooks', price: quickBooksPriceCents, cost: quickBooksCostCents }
	]);

	const displayPrice = (priceCents: number | null) =>
		priceCents === null ? '—' : formatPrice(priceCents / 100);

	function marginDollars(priceCents: number | null, costCents: number | null): number | null {
		if (priceCents === null || costCents === null) return null;
		return priceCents - costCents;
	}

	function marginPercent(priceCents: number | null, costCents: number | null): number | null {
		if (priceCents === null || priceCents === 0 || costCents === null) return null;
		return ((priceCents - costCents) / priceCents) * 100;
	}
</script>

<details
	{open}
	class="group rounded-md border border-surface-300 dark:border-surface-600 bg-surface-50/60 dark:bg-surface-900/30"
>
	<summary
		class="cursor-pointer list-none px-2 py-1.5 flex items-center gap-1.5 hover:bg-surface-100 dark:hover:bg-surface-700/60 rounded-md"
	>
		<ChevronDown
			size={16}
			class="shrink-0 transition-transform duration-150 group-open:rotate-180 text-surface-600 dark:text-surface-300"
		/>
		<span class="font-semibold text-sm whitespace-nowrap">Prices & margins</span>
		{#if !compact}
			<span class="hidden md:flex min-w-0 flex-grow justify-end gap-3 text-sm">
				{#each sources as source}
					<span class="whitespace-nowrap text-surface-600 dark:text-surface-300">
						{source.label}
						<strong class="text-surface-900 dark:text-surface-50">
							{displayPrice(source.price)}
						</strong>
					</span>
				{/each}
			</span>
		{/if}
		<span class="{compact ? '' : 'md:hidden'} flex-grow"></span>
	</summary>

	<div
		class="border-t border-surface-200 dark:border-surface-700 grid grid-cols-1 {compact
			? ''
			: 'md:grid-cols-3 md:divide-y-0 md:divide-x'} divide-y divide-surface-200 dark:divide-surface-700"
	>
		{#each sources as source}
			{@const margin = marginDollars(customPriceCents, source.cost)}
			{@const percent = marginPercent(customPriceCents, source.cost)}
			{@const suggestedMargin = marginDollars(source.price, source.cost)}
			{@const suggestedPercent = marginPercent(source.price, source.cost)}
			<div class="px-2.5 py-1.5">
				<div class="flex justify-between items-baseline gap-3">
					<strong>{source.label}</strong>
					<strong class="text-base">{displayPrice(source.price)}</strong>
				</div>
				<div
					class="pt-1 flex justify-between gap-3 text-sm text-surface-600 dark:text-surface-300"
				>
					<span>Cost</span>
					<span class="text-surface-900 dark:text-surface-50">{displayPrice(source.cost)}</span>
				</div>
				<div
					class="flex justify-between gap-3 text-sm text-surface-600 dark:text-surface-300"
				>
					<span>Margin</span>
					{#if margin !== null}
						<strong
							class={margin < 0
								? 'text-error-700 dark:text-error-300'
								: 'text-success-700 dark:text-success-300'}
						>
							{formatPrice(margin / 100)}
							{percent === null ? '' : ` · ${percent.toFixed(1)}%`}
						</strong>
					{:else}
						<span class="text-surface-900 dark:text-surface-50">—</span>
					{/if}
				</div>
				<div
					class="flex justify-between gap-3 text-sm text-surface-600 dark:text-surface-300"
				>
					<span>Suggested margin</span>
					{#if suggestedMargin !== null}
						<strong
							class={suggestedMargin < 0
								? 'text-error-700 dark:text-error-300'
								: 'text-success-700 dark:text-success-300'}
						>
							{formatPrice(suggestedMargin / 100)}
							{suggestedPercent === null ? '' : ` · ${suggestedPercent.toFixed(1)}%`}
						</strong>
					{:else}
						<span class="text-surface-900 dark:text-surface-50">—</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</details>
