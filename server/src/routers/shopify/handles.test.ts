import { describe, expect, test } from 'bun:test';
import { planHandleChanges, type HandleCandidate } from './handles';

const product = (over: Partial<HandleCandidate> = {}): HandleCandidate => ({
	id: 1,
	title: 'Toshiba External HD 1TB',
	gid: null,
	sprc: 'TOS850412',
	novexco: '850412',
	listing: {
		productId: 'gid://shopify/Product/1',
		handle: 'lg-50pk340s0ub-50-led-lcd-tv-tos850412',
		deleted: false
	},
	...over
});

describe('planHandleChanges', () => {
	test('replaces a handle made from another product’s title', () => {
		expect(planHandleChanges(['850412'], [product()])).toEqual([
			{
				code: '850412',
				status: 'change',
				productId: 1,
				title: 'Toshiba External HD 1TB',
				shopifyProductId: 'gid://shopify/Product/1',
				currentHandle: 'lg-50pk340s0ub-50-led-lcd-tv-tos850412',
				newHandle: 'toshiba-external-hd-1tb-tos850412'
			}
		]);
	});

	test('finds a product by SPR code, Guild code or current handle, in any case', () => {
		const candidates = [product({ gid: 'G-77' })];
		for (const code of ['tos850412', 'g-77', 'LG-50PK340S0UB-50-LED-LCD-TV-TOS850412']) {
			expect(planHandleChanges([code], candidates)[0].status).toBe('change');
		}
	});

	test('leaves a handle that already matches', () => {
		const listing = {
			productId: 'gid://shopify/Product/1',
			handle: 'toshiba-external-hd-1tb-tos850412',
			deleted: false
		};
		expect(planHandleChanges(['850412'], [product({ listing })])[0].status).toBe('unchanged');
	});

	test('reports codes it cannot act on', () => {
		const candidates = [
			product(),
			product({ id: 2, novexco: '850413', sprc: 'DUP', listing: null }),
			product({ id: 3, novexco: '850414', sprc: 'DUP' }),
			product({
				id: 4,
				novexco: '850415',
				sprc: 'GONE',
				listing: { productId: 'gid://shopify/Product/4', handle: 'old-handle', deleted: true }
			}),
			product({ id: 5, novexco: '850416', sprc: 'BLANK', title: null })
		];
		const status = (code: string) => planHandleChanges([code], candidates)[0].status;
		expect(status('999999')).toBe('notFound');
		expect(status('DUP')).toBe('ambiguous');
		expect(status('850413')).toBe('noListing');
		expect(status('850415')).toBe('noListing');
		// A deleted listing's handle no longer identifies the product
		expect(status('old-handle')).toBe('notFound');
		expect(status('850416')).toBe('noTitle');
	});

	test('plans a product once when several codes name it', () => {
		expect(planHandleChanges(['850412', 'TOS850412', ' 850412 ', ''], [product()])).toHaveLength(1);
	});
});
