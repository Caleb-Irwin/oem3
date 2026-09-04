export const MIN_SAMPLES = 3;
export const MIN_SPAN_DAYS = 14;
export const NOW_DAYS = 7;
export const SOON_DAYS = 30;
export const PLAN_DAYS = 60;
/** Use the full year available to smooth sparse or seasonal inventory history. */
export const HISTORY_WINDOW_DAYS = 365;
/** How much of that history the Smart Order sparkline plots. */
export const HISTORY_DISPLAY_DAYS = 90;

export interface ForecastSample {
	recordedAt: number;
	availableQuantity: number | null;
}

export interface ForecastResult {
	status: 'insufficient' | 'now' | 'soon' | 'later';
	availableQuantity: number | null;
	dailyDepletion: number | null;
	projectedStockoutAt: number | null;
	sampleCount: number;
	spanDays: number;
	observedDepletion: number;
	observedDays: number;
	restockCount: number;
	suggestedQuantity: number | null;
}

const finite = (value: number | null | undefined) =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;

export function effectiveAvailable(onHand: number | null, onSalesOrder: number | null) {
	const stock = finite(onHand);
	if (stock === null) return null;
	return stock - (finite(onSalesOrder) ?? 0);
}

export function calculateForecast(
	samples: ForecastSample[],
	currentAvailable: number | null,
	incomingPurchaseOrder: number | null,
	nowOrOptions: number | { now?: number; currentSalesOrder?: number | null } = Date.now()
): ForecastResult {
	// Forecast timestamps are persisted as PostgreSQL bigint milliseconds, so round the
	// fractional projection. Invalid callers use the current clock instead.
	const options = typeof nowOrOptions === 'number' ? { now: nowOrOptions } : nowOrOptions;
	const calculationTime = finite(options.now) ?? Date.now();
	const valid = samples
		.map((sample) => ({
			recordedAt: finite(sample.recordedAt),
			availableQuantity: finite(sample.availableQuantity)
		}))
		.filter(
			(sample): sample is { recordedAt: number; availableQuantity: number } =>
				sample.recordedAt !== null && sample.availableQuantity !== null
		)
		.sort((a, b) => a.recordedAt - b.recordedAt);
	const spanDays =
		valid.length > 1 ? (valid.at(-1)!.recordedAt - valid[0].recordedAt) / 86400000 : 0;
	const availableQuantity = finite(currentAvailable);
	const incoming = Math.max(0, finite(incomingPurchaseOrder) ?? 0);
	if (availableQuantity === null || valid.length < MIN_SAMPLES || spanDays < MIN_SPAN_DAYS) {
		return {
			status: 'insufficient',
			availableQuantity,
			dailyDepletion: null,
			projectedStockoutAt: null,
			sampleCount: valid.length,
			spanDays,
			observedDepletion: 0,
			observedDays: 0,
			restockCount: 0,
			suggestedQuantity: null
		};
	}
	const currentSalesOrder = Math.max(0, finite(options.currentSalesOrder) ?? 0);
	let observedDepletion = 0;
	let observedDays = 0;
	let restockCount = 0;
	for (let index = 1; index < valid.length; index++) {
		const previous = valid[index - 1];
		const sample = valid[index];
		const days = (sample.recordedAt - previous.recordedAt) / 86400000;
		if (days <= 0) continue;
		const delta = sample.availableQuantity - previous.availableQuantity;
		if (delta > 0) {
			restockCount++;
			continue;
		}
		observedDays += days;
		if (delta < 0) observedDepletion += -delta;
	}
	const dailyDepletion = observedDays > 0 ? observedDepletion / observedDays : 0;
	const daysUntilStockout =
		availableQuantity <= 0 ? 0 : dailyDepletion > 0 ? availableQuantity / dailyDepletion : null;
	const hasDemand = dailyDepletion > 0 || currentSalesOrder > 0;
	const projectedStockoutAt =
		!hasDemand || daysUntilStockout === null
			? null
			: Math.round(calculationTime + daysUntilStockout * 86400000);
	const status =
		daysUntilStockout !== null && daysUntilStockout <= NOW_DAYS && hasDemand
			? 'now'
			: daysUntilStockout !== null && daysUntilStockout <= SOON_DAYS && hasDemand
				? 'soon'
				: 'later';
	const suggestedQuantity =
		dailyDepletion > 0
			? Math.max(0, Math.ceil(dailyDepletion * PLAN_DAYS - availableQuantity - incoming))
			: null;
	return {
		status,
		availableQuantity,
		dailyDepletion,
		projectedStockoutAt,
		sampleCount: valid.length,
		spanDays,
		observedDepletion,
		observedDays,
		restockCount,
		suggestedQuantity
	};
}
