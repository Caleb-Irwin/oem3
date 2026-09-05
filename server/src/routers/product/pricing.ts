/** Prices ending in a 9, one cent below the next ten cent step. */
export function roundUpToNearestTenCents(value: number): number {
	return Math.ceil(value / 10) * 10 - 1;
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
