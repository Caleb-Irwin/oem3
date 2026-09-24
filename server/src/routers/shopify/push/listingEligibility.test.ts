import { describe, expect, test } from 'bun:test';
import { newListingHoldReason } from './listingEligibility';

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
