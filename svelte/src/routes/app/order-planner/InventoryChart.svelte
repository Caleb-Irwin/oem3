<script lang="ts">
	interface HistoryPoint {
		quantityOnHand: number | null;
		recordedAt: number;
	}

	interface Props {
		history: HistoryPoint[];
		current: number | null;
	}

	let { history, current }: Props = $props();

	const width = 160;
	const height = 54;
	const inset = 4;
	const monthMs = 30 * 24 * 60 * 60 * 1000;

	const chart = $derived.by(() => {
		const now = Date.now();
		const start = now - monthMs;
		const values = history
			.filter(
				(point): point is HistoryPoint & { quantityOnHand: number } =>
					point.quantityOnHand !== null && point.recordedAt >= start
			)
			.map((point) => ({ time: point.recordedAt, value: point.quantityOnHand }));

		if (current !== null && (values.length === 0 || values.at(-1)?.value !== current)) {
			values.push({ time: now, value: current });
		}
		if (values.length === 0) return null;

		const min = Math.min(...values.map((point) => point.value));
		const max = Math.max(...values.map((point) => point.value));
		const range = Math.max(max - min, 1);
		const points = values.map((point) => ({
			x: inset + ((point.time - start) / monthMs) * (width - inset * 2),
			y: height - inset - ((point.value - min) / range) * (height - inset * 2)
		}));

		return {
			min,
			max,
			first: values[0].value,
			last: values.at(-1)?.value ?? values[0].value,
			path: points
				.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
				.join(' '),
			lastPoint: points.at(-1)!
		};
	});
</script>

<div class="w-40 shrink-0" title="Quantity on hand over the last 30 days">
	{#if chart}
		<svg
			viewBox="0 0 {width} {height}"
			class="h-[54px] w-40 overflow-visible"
			role="img"
			aria-label={`Quantity on hand changed from ${chart.first} to ${chart.last} over the recorded portion of the last 30 days`}
		>
			<line
				x1={inset}
				y1={height - inset}
				x2={width - inset}
				y2={height - inset}
				class="stroke-surface-300 dark:stroke-surface-600"
				stroke-width="1"
			/>
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
			<span>30 days</span>
			<span
				>{chart.min === chart.max ? `${chart.last} on hand` : `${chart.min} to ${chart.max}`}</span
			>
		</div>
	{:else}
		<div
			class="grid h-[54px] place-content-center rounded border border-dashed border-surface-300 text-xs text-surface-500 dark:border-surface-600 dark:text-surface-300"
		>
			History starts here
		</div>
	{/if}
</div>
