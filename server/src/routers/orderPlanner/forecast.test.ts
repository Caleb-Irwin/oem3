import { describe, expect, test } from 'bun:test';
import { calculateForecast, effectiveAvailable, HISTORY_WINDOW_DAYS } from './forecast';
const day = 86400000;
const samples = (values: number[], spacing = 7) =>
	values.map((availableQuantity, i) => ({ recordedAt: i * spacing * day, availableQuantity }));
describe('calculateForecast', () => {
	test('uses up to one year of history', () => {
		expect(HISTORY_WINDOW_DAYS).toBe(365);
	});
	test('effective available subtracts sales orders and handles nulls', () => {
		expect(effectiveAvailable(10, 3)).toBe(7);
		expect(effectiveAvailable(null, 3)).toBeNull();
		expect(effectiveAvailable(10, null)).toBe(10);
	});
	test('decreasing stock', () =>
		expect(calculateForecast(samples([20, 13, 6]), 8, 0, 14 * day).dailyDepletion).toBeCloseTo(1));
	test('excludes restock jumps while retaining surrounding consumption', () => {
		const result = calculateForecast(
			[
				{ recordedAt: 0, availableQuantity: 20 },
				{ recordedAt: 7 * day, availableQuantity: 13 },
				{ recordedAt: 14 * day, availableQuantity: 53 },
				{ recordedAt: 21 * day, availableQuantity: 46 }
			],
			46,
			0,
			21 * day
		);
		expect(result.dailyDepletion).toBeCloseTo(1);
		expect(result.observedDepletion).toBe(14);
		expect(result.observedDays).toBe(14);
		expect(result.restockCount).toBe(1);
	});
	test('flat intervals count as observed time without inventing demand', () => {
		const result = calculateForecast(samples([10, 10, 10]), 10, 0, 14 * day);
		expect(result.observedDays).toBe(14);
		expect(result.observedDepletion).toBe(0);
		expect(result.dailyDepletion).toBe(0);
	});
	test('restock-only history has no depletion estimate', () => {
		const result = calculateForecast(samples([10, 20, 30]), 30, 0, 14 * day);
		expect(result.dailyDepletion).toBe(0);
		expect(result.observedDays).toBe(0);
		expect(result.restockCount).toBe(2);
	});
	test('flat stock', () =>
		expect(calculateForecast(samples([2, 2, 2]), 2, 0, 14 * day).status).toBe('later'));
	test('rising stock', () =>
		expect(calculateForecast(samples([2, 4, 6]), 6, 0, 14 * day).status).toBe('later'));
	test('two samples', () =>
		expect(calculateForecast(samples([3, 2]), 2, 0, 14 * day).status).toBe('insufficient'));
	test('thirteen day span', () =>
		expect(calculateForecast(samples([3, 2, 1], 6.5), 1, 0, 13 * day).status).toBe('insufficient'));
	test('fourteen day acceptance', () => {
		const result = calculateForecast(samples([3, 2, 1]), 1, 0, 14 * day);
		expect(result.status).not.toBe('insufficient');
		expect(result.dailyDepletion).toBeGreaterThan(0);
	});
	test('sales orders reduce effective stock', () =>
		expect(
			calculateForecast(samples([10, 5, 0]), effectiveAvailable(10, 8), 0, 14 * day).status
		).toBe('now'));
	test('quantity subtracts current and incoming', () =>
		expect(calculateForecast(samples([100, 90, 80]), 50, 10, 14 * day).suggestedQuantity).toBe(26));
	test('exhausted sparse stock is insufficient', () => {
		const r = calculateForecast(samples([0, 0]), 0, 0, 7 * day);
		expect(r.status).toBe('insufficient');
		expect(r.dailyDepletion).toBeNull();
		expect(r.suggestedQuantity).toBeNull();
	});
	test('flat zero stock is later, declining is now, and sales orders are now', () => {
		const flat = calculateForecast(samples([0, 0, 0]), 0, 0, 14 * day);
		expect(flat.status).toBe('later');
		expect(flat.projectedStockoutAt).toBeNull();
		expect(calculateForecast(samples([10, 5, 0]), 0, 0, 14 * day).status).toBe('now');
		expect(
			calculateForecast(samples([0, 0, 0]), 0, 0, { now: 14 * day, currentSalesOrder: 2 }).status
		).toBe('now');
	});
	test('exact urgency boundaries', () => {
		expect(calculateForecast(samples([14, 7, 0]), 7, 0, 14 * day).status).toBe('now');
		expect(calculateForecast(samples([60, 32, 4]), 120, 0, 14 * day).status).toBe('soon');
	});
	test('rounds fractional stockout timestamps for bigint storage', () => {
		const now = 1000;
		const result = calculateForecast(samples([10, 7, 4]), 2, 0, now);
		expect(result.status).toBe('now');
		expect(Number.isInteger(result.projectedStockoutAt)).toBe(true);
		expect(result.projectedStockoutAt).toBe(Math.round(now + (2 / (3 / 7)) * day));
	});
	test('invalid values and negative PO', () => {
		expect(calculateForecast(samples([3, 2, 1]), Number.NaN, 0, 14 * day).status).toBe(
			'insufficient'
		);
		expect(calculateForecast(samples([100, 90, 80]), 50, -10, 14 * day).suggestedQuantity).toBe(
			calculateForecast(samples([100, 90, 80]), 50, 0, 14 * day).suggestedQuantity
		);
		expect(
			calculateForecast(samples([100, 90, 80]), 1, Number.POSITIVE_INFINITY, 14 * day)
				.suggestedQuantity
		).toBe(85);
	});
	test('non-finite samples are excluded from minimum count', () =>
		expect(
			calculateForecast(
				[
					{ recordedAt: 0, availableQuantity: 10 },
					{ recordedAt: 7 * day, availableQuantity: Number.NaN },
					{ recordedAt: 14 * day, availableQuantity: 2 }
				],
				2,
				0,
				14 * day
			).status
		).toBe('insufficient'));
});
