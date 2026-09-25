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

/** Keeps the listing's existing tags, syncs the Flyer tag, and always marks it as OEM3 managed. */
export function shopifyListingTags(
	tagsJsonArr: string | null | undefined,
	inFlyer: boolean | null | undefined
): string[] {
	let existing: unknown;
	try {
		existing = JSON.parse(tagsJsonArr ?? '[]');
	} catch {
		// Invalid JSON
	}
	const tags = (Array.isArray(existing) ? existing : []).filter(
		(tag): tag is string => typeof tag === 'string' && (inFlyer || tag !== 'Flyer')
	);
	if (inFlyer && !tags.includes('Flyer')) tags.push('Flyer');
	if (!tags.includes('OEM3')) tags.push('OEM3');
	return tags;
}
