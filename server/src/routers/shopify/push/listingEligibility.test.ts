import { describe, expect, test } from 'bun:test';
import {
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
