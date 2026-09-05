import { describe, expect, test } from 'bun:test';
import { quickBooksTargetPriceCents, suggestQuickBooksConversion } from './pricing';

describe('quickBooksTargetPriceCents', () => {
	test('converts source prices in either direction', () => {
		expect(quickBooksTargetPriceCents(100, 12, 0)).toBe(1199);
		expect(quickBooksTargetPriceCents(1200, 1 / 12, 0)).toBe(99);
	});

	test('applies a signed percentage after the U/M conversion', () => {
		expect(quickBooksTargetPriceCents(1000, 1, -10)).toBe(899);
		expect(quickBooksTargetPriceCents(1000, 1, 10)).toBe(1099);
	});

	test('rounds up to a ten-cent step and subtracts one cent', () => {
		expect(quickBooksTargetPriceCents(900, 1, 0)).toBe(899);
		expect(quickBooksTargetPriceCents(901, 1, 0)).toBe(909);
	});

	test('keeps absent and zero prices safe', () => {
		expect(quickBooksTargetPriceCents(null, 12, 0)).toBeNull();
		expect(quickBooksTargetPriceCents(0, 12, 0)).toBe(0);
	});
});

describe('suggestQuickBooksConversion', () => {
	test('multiplies when QuickBooks uses the larger package', () => {
		expect(suggestQuickBooksConversion('ea', 'pk', 24)).toEqual({
			direction: 'multiply',
			packCount: 24,
			factor: 24
		});
	});

	test('divides when the source uses the larger package', () => {
		expect(suggestQuickBooksConversion('PAC', 'ea', null)).toEqual({
			direction: 'divide',
			packCount: 12,
			factor: 1 / 12
		});
	});

	test('uses the nearest reasonable pack count', () => {
		expect(suggestQuickBooksConversion('bx', 'ea', 7).packCount).toBe(6);
	});

	test('does not suggest a conversion for equivalent units', () => {
		expect(suggestQuickBooksConversion('PAC', 'pk', 12)).toEqual({
			direction: 'none',
			packCount: null,
			factor: 1
		});
	});
});
