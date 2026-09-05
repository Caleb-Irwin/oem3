import { describe, expect, test } from 'bun:test';
import {
	changePercentMilli,
	reconcilePriceChanges,
	type PriceChangeCandidate,
	type StoredPriceChange
} from './priceChange.reconcile';

const NOW = 1_700_000_000_000;

const candidate = (over: Partial<PriceChangeCandidate> = {}): PriceChangeCandidate => ({
	productRow: 1,
	currentPriceCents: 1000,
	targetPriceCents: 1200,
	inFlyer: false,
	source: 'guild',
	...over
});

const stored = (over: Partial<StoredPriceChange> = {}): StoredPriceChange => ({
	id: 10,
	productRow: 1,
	status: 'pending',
	approvedPriceCents: null,
	rejectedPriceCents: null,
	...over
});

describe('changePercentMilli', () => {
	test('reports percent change to three decimals', () => {
		expect(changePercentMilli(1000, 1200)).toBe(20_000);
		expect(changePercentMilli(1200, 1000)).toBe(-16_667);
	});
	test('treats a move away from zero as a full change', () => {
		expect(changePercentMilli(0, 500)).toBe(100_000);
		expect(changePercentMilli(0, 0)).toBe(0);
	});

	test('keeps large percentages that exceed a PostgreSQL integer', () => {
		expect(changePercentMilli(1, 30_000)).toBe(2_999_900_000);
	});
});

describe('reconcilePriceChanges', () => {
	test('queues a product that has no row yet', () => {
		const { keep, requeue, deleteIds } = reconcilePriceChanges([candidate()], [], NOW);
		expect(requeue).toHaveLength(0);
		expect(deleteIds).toHaveLength(0);
		expect(keep).toEqual([
			{
				productRow: 1,
				status: 'pending',
				currentPriceCents: 1000,
				targetPriceCents: 1200,
				changePercentMilli: 20_000,
				inFlyer: false,
				source: 'guild',
				computedAt: NOW
			}
		]);
	});

	test('keeps a rejection while the target sits where it was turned down', () => {
		const { keep, requeue } = reconcilePriceChanges(
			[candidate()],
			[stored({ status: 'rejected', rejectedPriceCents: 1200 })],
			NOW
		);
		expect(requeue).toHaveLength(0);
		expect(keep[0].status).toBe('rejected');
		// The QuickBooks price may still move underneath a rejection.
		expect(keep[0].currentPriceCents).toBe(1000);
	});

	test('re-queues a rejection once the target moves', () => {
		const { keep, requeue } = reconcilePriceChanges(
			[candidate({ targetPriceCents: 1300 })],
			[stored({ status: 'rejected', rejectedPriceCents: 1200 })],
			NOW
		);
		expect(keep).toHaveLength(0);
		expect(requeue[0].status).toBe('pending');
		expect(requeue[0].targetPriceCents).toBe(1300);
	});

	test('keeps an approval only while its price still stands', () => {
		const holds = reconcilePriceChanges(
			[candidate()],
			[stored({ status: 'approved', approvedPriceCents: 1200 })],
			NOW
		);
		expect(holds.keep[0].status).toBe('approved');

		const moved = reconcilePriceChanges(
			[candidate({ targetPriceCents: 1250 })],
			[stored({ status: 'approved', approvedPriceCents: 1200 })],
			NOW
		);
		expect(moved.requeue[0].status).toBe('pending');
	});

	test('leaves an exported change alone until QuickBooks catches up', () => {
		const { keep, requeue, deleteIds } = reconcilePriceChanges(
			[candidate()],
			[stored({ status: 'exported', approvedPriceCents: 1200 })],
			NOW
		);
		expect(requeue).toHaveLength(0);
		expect(deleteIds).toHaveLength(0);
		expect(keep[0].status).toBe('exported');
	});

	test('re-queues a new target after the previous target was exported', () => {
		const { keep, requeue } = reconcilePriceChanges(
			[candidate({ targetPriceCents: 1300 })],
			[stored({ status: 'exported', approvedPriceCents: 1200 })],
			NOW
		);
		expect(keep).toHaveLength(0);
		expect(requeue[0]).toMatchObject({ status: 'pending', targetPriceCents: 1300 });
	});

	test('drops rows whose product no longer differs', () => {
		const { keep, requeue, deleteIds } = reconcilePriceChanges(
			[],
			[stored({ status: 'rejected', rejectedPriceCents: 1200 })],
			NOW
		);
		expect(keep).toHaveLength(0);
		expect(requeue).toHaveLength(0);
		expect(deleteIds).toEqual([10]);
	});
});
