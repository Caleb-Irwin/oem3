import type { PriceChangeStatus } from './priceChange.table';

/** A product whose channel price no longer matches its target. */
export interface PriceChangeCandidate {
	productRow: number;
	currentPriceCents: number;
	targetPriceCents: number;
	inFlyer: boolean;
	source: 'guild' | 'spr' | 'other';
}

/** The parts of a stored change the reconciler needs to decide whether a decision still holds. */
export interface StoredPriceChange {
	id: number;
	productRow: number;
	status: PriceChangeStatus;
	approvedPriceCents: number | null;
	rejectedPriceCents: number | null;
}

/** A row to write, keyed by product so it can be upserted without reading ids back. */
export interface PriceChangeRow {
	productRow: number;
	status: PriceChangeStatus;
	currentPriceCents: number;
	targetPriceCents: number;
	changePercentMilli: number;
	inFlyer: boolean;
	source: 'guild' | 'spr' | 'other';
	computedAt: number;
}

export interface ReconciledPriceChanges {
	/** New rows, and refreshes of rows whose decision still stands. */
	keep: PriceChangeRow[];
	/** Rows back in play because the target moved out from under the decision. */
	requeue: PriceChangeRow[];
	/** Rows whose product no longer differs from its target at all. */
	deleteIds: number[];
}

/**
 * Percent change to three decimal places. A move away from a zero price has no meaningful
 * percentage, so it is reported as a full 100% in whichever direction it went.
 */
export function changePercentMilli(currentPriceCents: number, targetPriceCents: number): number {
	if (currentPriceCents === 0) {
		return targetPriceCents > 0 ? 100_000 : targetPriceCents < 0 ? -100_000 : 0;
	}
	return Math.round(((targetPriceCents - currentPriceCents) / currentPriceCents) * 100_000);
}

/**
 * Works out what the queue should look like now that prices have moved.
 *
 * A decision only survives while the target it was made against survives: approve $10, let the
 * target slide to $11, and the change comes back for another look. That is also what makes a
 * rejection stick — it stays out of the queue for exactly as long as the target sits where it
 * was turned down, and no longer.
 */
export function reconcilePriceChanges(
	candidates: PriceChangeCandidate[],
	stored: StoredPriceChange[],
	now: number
): ReconciledPriceChanges {
	const storedByProduct = new Map(stored.map((row) => [row.productRow, row]));
	const keep: PriceChangeRow[] = [];
	const requeue: PriceChangeRow[] = [];
	const seen = new Set<number>();

	for (const candidate of candidates) {
		seen.add(candidate.productRow);
		const values = {
			productRow: candidate.productRow,
			currentPriceCents: candidate.currentPriceCents,
			targetPriceCents: candidate.targetPriceCents,
			changePercentMilli: changePercentMilli(
				candidate.currentPriceCents,
				candidate.targetPriceCents
			),
			inFlyer: candidate.inFlyer,
			source: candidate.source,
			computedAt: now
		};

		const existing = storedByProduct.get(candidate.productRow);
		if (!existing || existing.status === 'pending') {
			keep.push({ ...values, status: 'pending' });
			continue;
		}

		const decisionHolds =
			existing.status === 'rejected'
				? existing.rejectedPriceCents === candidate.targetPriceCents
				: existing.approvedPriceCents === candidate.targetPriceCents;

		if (decisionHolds) keep.push({ ...values, status: existing.status });
		else requeue.push({ ...values, status: 'pending' });
	}

	return {
		keep,
		requeue,
		deleteIds: stored.filter((row) => !seen.has(row.productRow)).map((row) => row.id)
	};
}
