import { describe, expect, test } from 'bun:test';
import { costsMatch, quickBooksTargetPriceCents, suggestQuickBooksConversion } from './pricing';

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

describe('costsMatch', () => {
	test('matches costs within 25% either way', () => {
		expect(costsMatch(1000, 1250)).toBe(true);
		expect(costsMatch(1250, 1000)).toBe(true);
		expect(costsMatch(1000, 1251)).toBe(false);
	});

	test('does not match a different pack size', () => {
		expect(costsMatch(145, 1635)).toBe(false);
	});

	test('does not match without both costs', () => {
		expect(costsMatch(null, 1000)).toBe(false);
		expect(costsMatch(1000, 0)).toBe(false);
	});
});
