/** Prices ending in a 9, one cent below the next ten cent step. */
export function roundUpToNearestTenCents(value: number): number {
	return Math.ceil(value / 10) * 10 - 1;
}

/**
 * Convert a source price into its QuickBooks unit, apply the unit-specific adjustment, then
 * move it to a shelf-friendly price ending in 9. Zero stays zero because a negative price is
 * never valid.
 */
export function quickBooksTargetPriceCents(
	sourcePriceCents: number | null | undefined,
	sourceToQuickBooksFactor: number,
	adjustmentPercent: number
): number | null {
	if (sourcePriceCents === null || sourcePriceCents === undefined) return null;
	if (sourcePriceCents === 0) return 0;

	const convertedPrice =
		sourcePriceCents * sourceToQuickBooksFactor * (1 + adjustmentPercent / 100);
	return roundUpToNearestTenCents(convertedPrice);
}

export const COMMON_PACK_COUNTS = Array.from(
	new Set([
		2,
		3,
		5,
		...Array.from({ length: 20 }, (_, index) => (index + 1) * 6),
		...Array.from({ length: 12 }, (_, index) => (index + 1) * 10)
	])
).sort((a, b) => a - b);

export type QuickBooksConversionSuggestion = {
	direction: 'multiply' | 'divide' | 'none';
	packCount: number | null;
	factor: number;
};

/** Suggest a practical pack count and direction from the source and QuickBooks U/M values. */
export function suggestQuickBooksConversion(
	sourceUm: string | null | undefined,
	quickBooksUm: string | null | undefined,
	qtyPerUm: number | null | undefined
): QuickBooksConversionSuggestion {
	const sourceRank = unitRank(sourceUm);
	const quickBooksRank = unitRank(quickBooksUm);
	if (sourceRank === null || quickBooksRank === null || sourceRank === quickBooksRank) {
		return { direction: 'none', packCount: null, factor: 1 };
	}

	const requestedCount = qtyPerUm && qtyPerUm > 1 ? qtyPerUm : 12;
	const packCount = COMMON_PACK_COUNTS.reduce((nearest, count) =>
		Math.abs(count - requestedCount) < Math.abs(nearest - requestedCount) ? count : nearest
	);
	const direction = sourceRank < quickBooksRank ? 'multiply' : 'divide';
	return {
		direction,
		packCount,
		factor: direction === 'multiply' ? packCount : 1 / packCount
	};
}

function unitRank(um: string | null | undefined): number | null {
	if (!um) return null;
	const normalized = um.trim().toLowerCase();
	if (['ea', 'pr'].includes(normalized)) return 0;
	if (['pk', 'pac', 'bg', 'ct', 'cd', 'ev', 'kt', 'st', 'sl', 'tb'].includes(normalized)) return 1;
	if (['bx', 'box', 'cs'].includes(normalized)) return 2;
	return null;
}

/**
 * What an SPR item should sell for: their net price, unless it leaves less than the 80% markup
 * we hold over dealer net, in which case the marked up dealer net wins.
 */
export function sprSellPriceCents(
	netPriceCents: number | null | undefined,
	dealerNetPriceCents: number | null | undefined
): number | null {
	if (netPriceCents && dealerNetPriceCents) {
		return netPriceCents >= 1.8 * dealerNetPriceCents
			? netPriceCents
			: roundUpToNearestTenCents(dealerNetPriceCents * 1.8);
	}
	return netPriceCents ?? null;
}
