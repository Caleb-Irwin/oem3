import type { ProductQueryRes } from './types';

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
