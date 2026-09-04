<script lang="ts">
	interface HistoryPoint {
		recordedAt: number;
		value: number | null;
	}

	interface Props {
		history: HistoryPoint[];
		current: number | null;
		/** When set and still ahead of us, the run-out is drawn as a dashed line down to zero. */
		projectedStockoutAt?: number | null;
		historyDays?: number;
		/** Names the plotted series in the tooltip and for screen readers. */
		seriesLabel?: string;
	}

	let {
		history,
		current,
		projectedStockoutAt = null,
		historyDays = 30,
		seriesLabel = 'Quantity on hand'
	}: Props = $props();

	const width = 160;
	const height = 54;
	const inset = 4;

	const spanMs = $derived(historyDays * 24 * 60 * 60 * 1000);
	const historyLabel = $derived(
		historyDays >= 60 && historyDays % 30 === 0
			? `${historyDays / 30} months`
			: `${historyDays} days`
	);

	const chart = $derived.by(() => {
		const now = Date.now();
		const start = now - spanMs;
		const points = history
			.filter(
				(point): point is HistoryPoint & { value: number } =>
					point.value !== null && point.recordedAt >= start
			)
			.map((point) => ({ time: point.recordedAt, value: point.value }));

		// Carry the series forward to today so the projection starts where the line ends.
		if (current !== null && (points.length === 0 || points[points.length - 1].time < now))
			points.push({ time: now, value: current });
		if (points.length === 0) return null;

		const projecting = projectedStockoutAt !== null && projectedStockoutAt > now;
		const axisSpan = Math.max((projecting ? projectedStockoutAt : now) - start, spanMs);
		// Zero has to be on the scale for the run-out line to land on the baseline.
		const bounds = projecting
			? [...points.map((point) => point.value), 0]
			: points.map((p) => p.value);
		const min = Math.min(...bounds);
		const max = Math.max(...bounds);
		const range = Math.max(max - min, 1);
		const xFor = (time: number) => inset + ((time - start) / axisSpan) * (width - inset * 2);
		const yFor = (value: number) => height - inset - ((value - min) / range) * (height - inset * 2);

		const plotted = points.map((point) => ({ x: xFor(point.time), y: yFor(point.value) }));
		const last = plotted[plotted.length - 1];
		const daysOut = projecting
			? Math.max(1, Math.ceil((projectedStockoutAt - now) / 86400000))
			: null;

		return {
			min,
			max,
			first: points[0].value,
			last: points[points.length - 1].value,
			path: plotted
				.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
				.join(' '),
			lastPoint: last,
			stockoutX: projecting ? xFor(projectedStockoutAt) : null,
			projectionPath: projecting
				? `M ${last.x} ${last.y} L ${xFor(projectedStockoutAt)} ${yFor(0)}`
				: null,
			daysOut
		};
	});
</script>

<div
	class="w-40 shrink-0"
	title={chart?.daysOut
		? `${seriesLabel} over the last ${historyLabel}, with the estimated run-out in ${chart.daysOut} days marked`
		: `${seriesLabel} over the last ${historyLabel}`}
>
	{#if chart}
		<svg
			viewBox="0 0 {width} {height}"
			class="h-[54px] w-40 overflow-visible"
			role="img"
			aria-label="{seriesLabel} changed from {chart.first} to {chart.last} over the recorded portion of the last {historyLabel}{chart.daysOut
				? `, and is projected to run out in ${chart.daysOut} days`
				: ''}"
		>
			<line
				x1={inset}
				y1={height - inset}
				x2={width - inset}
				y2={height - inset}
				class="stroke-surface-300 dark:stroke-surface-600"
				stroke-width="1"
			/>
			{#if chart.projectionPath}
				<path
					d={chart.projectionPath}
					fill="none"
					class="stroke-error-500 dark:stroke-error-400"
					stroke-width="1.5"
					stroke-dasharray="3 3"
				/>
			{/if}
			{#if chart.stockoutX !== null}
				<line
					x1={chart.stockoutX}
					y1={inset}
					x2={chart.stockoutX}
					y2={height - inset}
					class="stroke-error-500 dark:stroke-error-400"
					stroke-width="1.5"
					stroke-dasharray="3 3"
				/>
			{/if}
			<path
				d={chart.path}
				fill="none"
				class="stroke-primary-600 dark:stroke-primary-400"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<circle
				cx={chart.lastPoint.x}
				cy={chart.lastPoint.y}
				r="3"
				class="fill-primary-600 dark:fill-primary-400"
			/>
		</svg>
		<div
			class="flex justify-between text-[10px] leading-none text-surface-500 dark:text-surface-300"
		>
			<span>{historyLabel}</span>
			<span
				>{chart.min === chart.max ? `${chart.last} on hand` : `${chart.min} to ${chart.max}`}</span
			>
		</div>
	{:else}
		<div
			class="grid h-[54px] place-content-center rounded border border-dashed border-surface-300 text-xs text-surface-500 dark:border-surface-600 dark:text-surface-300"
		>
			No history yet
		</div>
	{/if}
</div>
