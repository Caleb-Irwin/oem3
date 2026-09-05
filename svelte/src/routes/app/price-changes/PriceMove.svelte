<script lang="ts">
	import { formatPrice } from '$lib/formatPrice';
	import ArrowRight from 'lucide-svelte/icons/arrow-right';
	import { formatPercent } from './types';

	interface Props {
		currentPriceCents: number;
		targetPriceCents: number;
		changePercent: number;
		size?: 'sm' | 'lg';
	}

	let { currentPriceCents, targetPriceCents, changePercent, size = 'sm' }: Props = $props();

	const tone = $derived(
		changePercent > 0
			? 'bg-success-500/15 text-success-700 dark:text-success-300'
			: 'bg-error-500/15 text-error-700 dark:text-error-300'
	);
</script>

<div class="flex items-center gap-2 {size === 'lg' ? 'text-2xl' : ''} whitespace-nowrap">
	<span class="text-surface-500 line-through dark:text-surface-400">
		{formatPrice(currentPriceCents / 100)}
	</span>
	<ArrowRight size={size === 'lg' ? 22 : 16} class="shrink-0 opacity-60" />
	<strong>{formatPrice(targetPriceCents / 100)}</strong>
	<span
		class="rounded-full px-2 py-0.5 {tone} {size === 'lg' ? 'text-base' : 'text-xs'} font-semibold"
	>
		{formatPercent(changePercent)}
	</span>
</div>
