import { describe, expect, test } from 'bun:test';
import {
	isOem3Listing,
	listingsToArchive,
	newListingHoldReason,
	shopifyListingStatus,
	shopifyListingTags
} from './listingEligibility';

const base = {
	deleted: false,
	status: 'ACTIVE' as 'ACTIVE' | 'DISCONTINUED' | 'DISABLED' | null,
	newListingHold: null as 'discontinued' | 'duplicate' | 'noEtilizeContent' | null
};

describe('newListingHoldReason', () => {
	test('allows products the unifier does not hold back', () => {
		expect(newListingHoldReason(base)).toBeNull();
	});

	test('holds back deleted and disabled products', () => {
		expect(newListingHoldReason({ ...base, deleted: true })).toBe('deleted');
		expect(newListingHoldReason({ ...base, status: 'DISABLED' })).toBe('deleted');
	});

	test("uses the product unifier's hold reason", () => {
		expect(newListingHoldReason({ ...base, newListingHold: 'discontinued' })).toBe('discontinued');
		expect(newListingHoldReason({ ...base, newListingHold: 'duplicate' })).toBe('duplicate');
		expect(newListingHoldReason({ ...base, newListingHold: 'noEtilizeContent' })).toBe(
			'noEtilizeContent'
		);
	});
});

describe('shopifyListingStatus', () => {
	test('lists active products and archives disabled ones', () => {
		expect(shopifyListingStatus('ACTIVE', 'ARCHIVED')).toBe('ACTIVE');
		expect(shopifyListingStatus('DISABLED', 'ACTIVE')).toBe('ARCHIVED');
	});

	test('keeps discontinued products listed but does not unarchive them', () => {
		expect(shopifyListingStatus('DISCONTINUED', 'ACTIVE')).toBe('ACTIVE');
		expect(shopifyListingStatus('DISCONTINUED', undefined)).toBe('ACTIVE');
		expect(shopifyListingStatus('DISCONTINUED', 'ARCHIVED')).toBe('ARCHIVED');
	});

	test('leaves the status alone when the product has none', () => {
		expect(shopifyListingStatus(null, 'ACTIVE')).toBeUndefined();
	});
});

describe('shopifyListingTags', () => {
	test('always tags the listing as OEM3', () => {
		expect(shopifyListingTags(null, false)).toEqual(['OEM3']);
		expect(shopifyListingTags('[]', false)).toEqual(['OEM3']);
		expect(shopifyListingTags('not json', false)).toEqual(['OEM3']);
		expect(shopifyListingTags('["Sale"]', false)).toEqual(['Sale', 'OEM3']);
	});

	test('adds and removes the Flyer tag', () => {
		expect(shopifyListingTags('["OEM3"]', true)).toEqual(['OEM3', 'Flyer']);
		expect(shopifyListingTags('["Flyer","OEM3"]', true)).toEqual(['Flyer', 'OEM3']);
		expect(shopifyListingTags('["Flyer","OEM3"]', false)).toEqual(['OEM3']);
	});
});

describe('isOem3Listing', () => {
	test('only matches listings tagged OEM3', () => {
		expect(isOem3Listing('["Sale","OEM3"]')).toBe(true);
		expect(isOem3Listing('["Sale"]')).toBe(false);
		expect(isOem3Listing('["oem3"]')).toBe(false);
		expect(isOem3Listing(null)).toBe(false);
		expect(isOem3Listing('not json')).toBe(false);
	});
});

describe('listingsToArchive', () => {
	const listing = { productId: 'gid://shopify/Product/1', lastUpdated: 100 };

	test('waits for a unifier run that starts after the listing is first seen unmatched', () => {
		const first = listingsToArchive([listing], {}, 500, 1000);
		expect(first.toArchive).toEqual([]);
		expect(first.unmatchedSince).toEqual({ [listing.productId]: 1000 });

		expect(listingsToArchive([listing], first.unmatchedSince, 1000, 2000).toArchive).toEqual([]);
		expect(listingsToArchive([listing], first.unmatchedSince, 1500, 2000).toArchive).toEqual([
			listing
		]);
	});

	test('waits for a unifier run that starts after the listing last changed', () => {
		const changed = { ...listing, lastUpdated: 1600 };
		expect(
			listingsToArchive([changed], { [listing.productId]: 1000 }, 1500, 2000).toArchive
		).toEqual([]);
	});

	test('archives nothing before the unifier has recorded a run', () => {
		expect(
			listingsToArchive([listing], { [listing.productId]: 1000 }, undefined, 2000).toArchive
		).toEqual([]);
	});

	test('forgets listings that are matched again', () => {
		expect(listingsToArchive([], { [listing.productId]: 1000 }, 1500, 2000).unmatchedSince).toEqual(
			{}
		);
	});
});
