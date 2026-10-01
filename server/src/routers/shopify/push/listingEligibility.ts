import type { ProductQueryRes, Shopify } from './types';

export type ListingHoldReason = 'deleted' | NonNullable<ProductQueryRes['newListingHold']>;

type ListingProduct = Pick<ProductQueryRes, 'deleted' | 'status' | 'newListingHold'>;

/**
 * Why a product that is not yet on Shopify should not get a new listing, or null if it should.
 * Existing listings are always kept up to date; this only gates creating new ones. The product
 * unifier decides newListingHold, so it can be overridden per product.
 */
export function newListingHoldReason(product: ListingProduct): ListingHoldReason | null {
	if (product.deleted || product.status === 'DISABLED') return 'deleted';
	return product.newListingHold;
}

/**
 * The Shopify status to push, or undefined to leave it unchanged. Discontinued products stay
 * listed while they are listed, but an archived listing is not brought back for them.
 */
export function shopifyListingStatus(
	status: ProductQueryRes['status'] | undefined,
	existingStatus: Shopify['status'] | undefined
): 'ACTIVE' | 'ARCHIVED' | undefined {
	if (status === 'ACTIVE') return 'ACTIVE';
	if (status === 'DISABLED') return 'ARCHIVED';
	if (status === 'DISCONTINUED') return existingStatus === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';
	return undefined;
}

const OEM3_TAG = 'OEM3';

function parseTags(tagsJsonArr: string | null | undefined): string[] {
	let tags: unknown;
	try {
		tags = JSON.parse(tagsJsonArr ?? '[]');
	} catch {
		// Invalid JSON
	}
	return (Array.isArray(tags) ? tags : []).filter((tag): tag is string => typeof tag === 'string');
}

/** Keeps the listing's existing tags, syncs the Flyer tag, and always marks it as OEM3 managed. */
export function shopifyListingTags(
	tagsJsonArr: string | null | undefined,
	inFlyer: boolean | null | undefined
): string[] {
	const tags = parseTags(tagsJsonArr).filter((tag) => inFlyer || tag !== 'Flyer');
	if (inFlyer && !tags.includes('Flyer')) tags.push('Flyer');
	if (!tags.includes(OEM3_TAG)) tags.push(OEM3_TAG);
	return tags;
}

/** Whether OEM3 created or manages the listing. Only these are archived when their product is gone. */
export function isOem3Listing(tagsJsonArr: string | null | undefined): boolean {
	return parseTags(tagsJsonArr).includes(OEM3_TAG);
}

/**
 * Picks the unmatched listings to archive, and returns when each was first seen unmatched. A
 * listing is archived once a product unifier run has matched every unconnected product against
 * it and still left it unmatched: one that started after the listing was first seen unmatched
 * and after its last change. `unconnectedMatchedAt` is when the latest such run started.
 */
export function listingsToArchive<L extends { productId: string; lastUpdated: number }>(
	unmatched: L[],
	previouslyUnmatchedSince: Record<string, number>,
	unconnectedMatchedAt: number | undefined,
	now: number
): { toArchive: L[]; unmatchedSince: Record<string, number> } {
	const toArchive: L[] = [],
		unmatchedSince: Record<string, number> = {};
	for (const listing of unmatched) {
		const since = previouslyUnmatchedSince[listing.productId] ?? now;
		unmatchedSince[listing.productId] = since;
		if (
			unconnectedMatchedAt !== undefined &&
			since < unconnectedMatchedAt &&
			listing.lastUpdated < unconnectedMatchedAt
		)
			toArchive.push(listing);
	}
	return { toArchive, unmatchedSince };
}
