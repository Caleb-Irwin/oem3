import { describe, expect, test } from 'bun:test';
import { flyerStatus, isBetterFlyerOffer, isFlyerActive, nextFlyerBoundary } from './activation';

const DAY = 24 * 60 * 60 * 1000;

const set = (over: Partial<Parameters<typeof isFlyerActive>[0]> = {}) => ({
	override: 'auto' as const,
	startDate: Date.parse('2026-09-01T06:00:00.000Z'),
	endDate: Date.parse('2026-09-14T06:00:00.000Z'),
	deleted: false,
	...over
});

describe('Guild flyer activation', () => {
	test('runs from the start date through the end of the end date', () => {
		expect(isFlyerActive(set(), Date.parse('2026-08-31T23:00:00.000Z'))).toBe(false);
		expect(isFlyerActive(set(), Date.parse('2026-09-01T06:00:00.000Z'))).toBe(true);
		expect(isFlyerActive(set(), Date.parse('2026-09-14T23:00:00.000Z'))).toBe(true);
		expect(isFlyerActive(set(), Date.parse('2026-09-15T06:00:00.000Z'))).toBe(false);
	});

	test('overrides beat the dates', () => {
		const expired = { override: 'active' as const, startDate: 0, endDate: 0, deleted: false };
		expect(isFlyerActive(expired, Date.parse('2026-09-20T00:00:00.000Z'))).toBe(true);
		expect(flyerStatus(expired, Date.parse('2026-09-20T00:00:00.000Z'))).toBe('forcedOn');

		const forcedOff = set({ override: 'inactive' });
		expect(isFlyerActive(forcedOff, Date.parse('2026-09-05T00:00:00.000Z'))).toBe(false);
		expect(flyerStatus(forcedOff, Date.parse('2026-09-05T00:00:00.000Z'))).toBe('forcedOff');
	});

	test('reports upcoming and expired flyers', () => {
		expect(flyerStatus(set(), Date.parse('2026-08-20T00:00:00.000Z'))).toBe('upcoming');
		expect(flyerStatus(set(), Date.parse('2026-09-05T00:00:00.000Z'))).toBe('active');
		expect(flyerStatus(set(), Date.parse('2026-09-20T00:00:00.000Z'))).toBe('expired');
	});

	test('deleted flyers never run', () => {
		expect(isFlyerActive(set({ deleted: true }), Date.parse('2026-09-05T00:00:00.000Z'))).toBe(
			false
		);
	});

	test('next boundary is the soonest automatic start or end', () => {
		const upcoming = set({
			startDate: Date.parse('2026-09-10T06:00:00.000Z'),
			endDate: Date.parse('2026-09-20T06:00:00.000Z')
		});
		const now = Date.parse('2026-09-05T00:00:00.000Z');

		expect(nextFlyerBoundary([set(), upcoming], now)).toBe(Date.parse('2026-09-10T06:00:00.000Z'));
		// The running flyer stops at the end of its last day.
		expect(nextFlyerBoundary([set()], now)).toBe(Date.parse('2026-09-14T06:00:00.000Z') + DAY);
		// Overridden and deleted flyers never change on their own.
		expect(
			nextFlyerBoundary([set({ override: 'active' }), set({ deleted: true })], now)
		).toBeNull();
	});
});

describe('Guild flyer duplicate items', () => {
	const offer = (priceCents: number | null, startDate: number, flyerNumber: number) => ({
		priceCents,
		startDate,
		flyerNumber
	});

	test('the lowest flyer price wins', () => {
		expect(isBetterFlyerOffer(offer(500, 1, 1), offer(600, 2, 2))).toBe(true);
		expect(isBetterFlyerOffer(offer(700, 2, 2), offer(600, 1, 1))).toBe(false);
	});

	test('a priced offer beats one with no flyer price', () => {
		expect(isBetterFlyerOffer(offer(700, 1, 1), offer(null, 2, 2))).toBe(true);
		expect(isBetterFlyerOffer(offer(null, 2, 2), offer(700, 1, 1))).toBe(false);
	});

	test('equal prices go to the flyer that started most recently', () => {
		expect(isBetterFlyerOffer(offer(500, 2, 1), offer(500, 1, 2))).toBe(true);
		expect(isBetterFlyerOffer(offer(500, 1, 2), offer(500, 2, 1))).toBe(false);
		expect(isBetterFlyerOffer(offer(500, 1, 2), offer(500, 1, 1))).toBe(true);
	});
});
