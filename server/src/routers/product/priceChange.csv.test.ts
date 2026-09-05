import { describe, expect, test } from 'bun:test';
import { buildQuickBooksPriceCsv } from './priceChange.csv';

const items = [
	{
		qbId: 'Office:12345',
		qbAccount: 'Sales',
		preferredVendor: 'Guild',
		previousPriceCents: 999,
		newPriceCents: 1249
	},
	{
		qbId: 'Ink, Toner:98765',
		qbAccount: null,
		preferredVendor: null,
		previousPriceCents: 500,
		newPriceCents: 450
	}
];

describe('buildQuickBooksPriceCsv', () => {
	test('writes the new price with the QuickBooks import header', () => {
		expect(buildQuickBooksPriceCsv(items)).toBe(
			[
				'TYPE,ACCOUNT,NAME,PRICE/AMOUNT,PREFERRED VENDOR',
				'Inventory Part,Sales,Office:12345,12.49,Guild',
				'Inventory Part,,"Ink, Toner:98765",4.50,'
			].join('\n')
		);
	});

	test('revert mode writes the price the item held before the export', () => {
		const csv = buildQuickBooksPriceCsv(items, { revert: true }).split('\n');
		expect(csv[1]).toBe('Inventory Part,Sales,Office:12345,9.99,Guild');
		expect(csv[2]).toBe('Inventory Part,,"Ink, Toner:98765",5.00,');
	});

	test('escapes quotes inside a field', () => {
		const csv = buildQuickBooksPriceCsv([
			{
				qbId: 'Paper 8.5" x 11"',
				qbAccount: 'Sales',
				preferredVendor: null,
				previousPriceCents: 100,
				newPriceCents: 200
			}
		]);
		expect(csv.split('\n')[1]).toBe('Inventory Part,Sales,"Paper 8.5"" x 11""",2.00,');
	});

	test('quotes fields containing carriage returns', () => {
		const csv = buildQuickBooksPriceCsv([
			{
				qbId: 'Paper\rCase',
				qbAccount: 'Sales',
				preferredVendor: null,
				previousPriceCents: 100,
				newPriceCents: 200
			}
		]);
		expect(csv.split('\n')[1]).toBe('Inventory Part,Sales,"Paper\rCase",2.00,');
	});
});
