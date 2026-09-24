import { describe, expect, test } from 'bun:test';
import { findDuplicates } from './duplicates';
import type { sprPriceFile } from './table';

const row = (
	novexcoCode: string,
	overrides: Partial<typeof sprPriceFile.$inferInsert> = {}
): typeof sprPriceFile.$inferInsert => ({
	novexcoCode,
	sprcSku: null,
	guildCode: null,
	etilizeId: '100',
	status: 'Active',
	supplierName: 'ACME',
	supplierSku: 'A-1',
	um: 'EA',
	unitsPerPack: 1,
	inventory: null,
	duplicateOf: null,
	duplicateCodes: null,
	lastUpdated: 0,
	...overrides
});

describe('findDuplicates', () => {
	test('points a discontinued re-code at the active code', () => {
		const items = [row('1', { status: 'Discontinued' }), row('2')];
		findDuplicates(items);
		expect(items[0].duplicateOf).toBe('2');
		expect(items[1].duplicateOf).toBeNull();
		expect(items[1].duplicateCodes).toBe('1');
	});

	test('does not treat different supplier SKUs, units or pack sizes as twins', () => {
		const items = [
			row('1'),
			row('2', { supplierSku: 'A-2' }),
			row('3', { um: 'BOX' }),
			row('4', { unitsPerPack: 12 })
		];
		findDuplicates(items);
		expect(items.every((i) => i.duplicateOf === null && i.duplicateCodes === null)).toBe(true);
	});

	test('ignores rows without an Etilize product or supplier SKU', () => {
		const items = [row('1', { etilizeId: null }), row('2', { etilizeId: null })];
		findDuplicates(items);
		expect(items.every((i) => i.duplicateOf === null)).toBe(true);
	});

	test('prefers Guild data, then Novexco stock, when both codes are active', () => {
		const withGuild = [row('1'), row('2', { guildCode: 'G-2' })];
		findDuplicates(withGuild);
		expect(withGuild[0].duplicateOf).toBe('2');

		const withStock = [row('1', { inventory: 3 }), row('2', { inventory: 40 })];
		findDuplicates(withStock);
		expect(withStock[0].duplicateOf).toBe('2');
	});

	test('picks one preferred code for a group of three', () => {
		const items = [row('3', { status: 'Discontinued' }), row('1'), row('2')];
		findDuplicates(items);
		expect(items.filter((i) => i.duplicateOf === null)).toHaveLength(1);
		expect(items[1].duplicateCodes).toBe('2,3');
		expect(items[2].duplicateOf).toBe('1');
	});
});
