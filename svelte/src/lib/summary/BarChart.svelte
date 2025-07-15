<script lang="ts">
	interface Props {
		data: Record<string, number>;
		variant?: 'error' | 'warning' | 'secondary';
		labelFormatter?: (key: string) => string;
		customColors?: Record<string, string>;
		showZeroCounts?: boolean;
		showTotal?: boolean;
		totalLabel?: string;
		maxColumns?: number;
	}

	let {
		data,
		variant = 'error',
		labelFormatter = (key) => key,
		customColors,
		showZeroCounts = false,
		showTotal = false,
		totalLabel = 'Total',
		maxColumns = 6
	}: Props = $props();
	const entries = $derived(
		Object.entries(data).filter(([_, count]) => showZeroCounts || count > 0)
	);
	const nonZeroEntries = $derived(Object.entries(data).filter(([_, count]) => count > 0));
	const totalCount = $derived(nonZeroEntries.reduce((sum, [_, count]) => sum + count, 0));

	// Add total to entries if showTotal is enabled
	const entriesWithTotal = $derived(
		showTotal && totalCount > 0
			? [...entries, ['__total__', totalCount] as [string, number]]
			: entries
	);

	// Calculate constrained max columns: min 2, max number of entries
	const constrainedMaxColumns = $derived(
		Math.max(2, Math.min(maxColumns, entriesWithTotal.length))
	);

	const defaultColors = $derived(
		variant === 'error'
			? [
					'bg-error-500',
					'bg-error-400',
					'bg-error-600',
					'bg-error-300',
					'bg-error-700',
					'bg-error-800',
					'bg-error-200',
					'bg-error-900',
					'bg-error-100',
					'bg-error-50'
				]
			: variant === 'warning'
				? [
						'bg-warning-500',
						'bg-warning-400',
						'bg-warning-600',
						'bg-warning-300',
						'bg-warning-700',
						'bg-warning-800',
						'bg-warning-200',
						'bg-warning-900',
						'bg-warning-100',
						'bg-warning-50'
					]
				: [
						'bg-secondary-500',
						'bg-secondary-400',
						'bg-secondary-600',
						'bg-secondary-300',
						'bg-secondary-700',
						'bg-secondary-800',
						'bg-secondary-200',
						'bg-secondary-900',
						'bg-secondary-100',
						'bg-secondary-50'
					]
	);

	// Function to get color for a specific key
	function getColor(key: string, index: number): string {
		if (key === '__total__') {
			return 'bg-surface-200';
		}
		if (customColors && customColors[key]) {
			return customColors[key];
		}
		return defaultColors[index % defaultColors.length];
	}

	// Function to get label for a specific key
	function getLabel(key: string): string {
		if (key === '__total__') {
			return totalLabel;
		}
		return labelFormatter(key);
	}

	// Function to get text color class for a specific key
	function getTextColor(key: string): string {
		return variant === 'error'
			? 'text-error-800 dark:text-error-200'
			: variant === 'warning'
				? 'text-warning-800 dark:text-warning-200'
				: 'text-secondary-800 dark:text-secondary-200';
	}

	// Function to get badge class for a specific key
	function getBadgeClass(key: string): string {
		return variant === 'error'
			? 'badge variant-soft-error text-xs'
			: variant === 'warning'
				? 'badge variant-soft-warning text-xs'
				: 'badge variant-soft-secondary text-xs';
	}

	// Function to get grid classes based on constrainedMaxColumns
	function getGridClasses(): string {
		let classes = 'grid gap-1 text-xs grid-cols-1';

		if (constrainedMaxColumns >= 2) classes += ' sm:grid-cols-2';
		if (constrainedMaxColumns >= 3) classes += ' md:grid-cols-3';
		if (constrainedMaxColumns >= 4) classes += ' lg:grid-cols-4';
		if (constrainedMaxColumns >= 5) classes += ' xl:grid-cols-5';
		if (constrainedMaxColumns >= 6) classes += ' 2xl:grid-cols-6';

		return classes;
	}
</script>

{#if entriesWithTotal.length > 0}
	{#if totalCount > 0}
		<!-- Stacked bar chart -->
		<div
			class="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-3 mb-3 overflow-hidden flex"
		>
			{#each nonZeroEntries as [key, count], index}
				{@const percentage = (count / totalCount) * 100}
				<div
					class="{getColor(key, index)} h-full transition-all duration-300"
					style="width: {percentage}%"
					title="{getLabel(key)}: {count}"
				></div>
			{/each}
		</div>
	{/if}

	<!-- Legend -->
	<div class={getGridClasses()}>
		{#each entriesWithTotal as [key, count], index}
			<div class="flex items-center gap-2 px-1">
				<div class="w-3 h-3 rounded-sm {getColor(key, index)} flex-shrink-0"></div>
				<span class="truncate flex-1 {getTextColor(key)}">
					{getLabel(key)}
				</span>
				<span class={getBadgeClass(key)}>
					{count}
				</span>
			</div>
		{/each}
	</div>
{:else}
	<p class="text-center text-surface-600 dark:text-surface-300 py-4">No data available for chart</p>
{/if}
