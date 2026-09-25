import { describe, expect, test } from 'bun:test';
import { etilizeTitle, packSizeAgrees, withoutPackSize } from './etilizeTitle';

describe('etilizeTitle', () => {
	test('adds the subtitle so variants can be told apart', () => {
		expect(etilizeTitle('Prang Washable Paint', 'Red - 16 oz - 1 Each')).toBe(
			'Prang Washable Paint - Red - 16 oz - 1 Each'
		);
	});

	test('skips spec segments that do not fit', () => {
		expect(
			etilizeTitle(
				'Woods Power Extension Cord',
				'125 V AC - Off White Braided Jacket - 14 ft',
				undefined,
				45
			)
		).toBe('Woods Power Extension Cord - 125 V AC - 14 ft');
	});

	test('keeps a long main title whole without adding the subtitle', () => {
		const main =
			'Offix Heavy Duty Ring Binder with Clear Overlay and Two Internal Pockets for Letter Sheets';
		expect(etilizeTitle(main, 'Green - 1 Each')).toBe(main);
	});

	test('skips repeated spec segments', () => {
		expect(etilizeTitle('Lexmark Drum Unit', 'Black - Laser - 60000 Pages - Black')).toBe(
			'Lexmark Drum Unit - Black - Laser - 60000 Pages'
		);
	});

	test('uses the main title alone without a subtitle', () => {
		expect(etilizeTitle('Quartet Marker Board', null)).toBe('Quartet Marker Board');
		expect(etilizeTitle('Quartet Marker Board', '')).toBe('Quartet Marker Board');
	});

	test('has no title without a main title', () => {
		expect(etilizeTitle(null, 'Red')).toBeNull();
		expect(etilizeTitle('  ', 'Red')).toBeNull();
	});

	test('drops an unkept pack size from the main title', () => {
		expect(etilizeTitle('Kyocera Toner - Yellow - 1 Each', '3000 Pages', () => false)).toBe(
			'Kyocera Toner - Yellow - 3000 Pages'
		);
	});

	test('adds the pack size only when it is kept', () => {
		expect(etilizeTitle('Sharpie Marker', 'Green Ink - 12 / Box', () => false)).toBe(
			'Sharpie Marker - Green Ink'
		);
		expect(etilizeTitle('Sharpie Marker', 'Green Ink - 12 / Box', () => true)).toBe(
			'Sharpie Marker - Green Ink - 12 / Box'
		);
	});
});

describe('packSizeAgrees', () => {
	test('never keeps 1 Each', () => {
		expect(packSizeAgrees({ count: 1, each: true }, 'EA', null)).toBe(false);
	});

	test('keeps a pack size matching how Novexco sells the item', () => {
		expect(packSizeAgrees({ count: 1, each: false }, 'EA', null)).toBe(true);
		expect(packSizeAgrees({ count: 12, each: false }, 'BOX', 12)).toBe(true);
		expect(packSizeAgrees({ count: 12, each: true }, 'BOX', 12)).toBe(true);
		expect(packSizeAgrees({ count: 1, each: false }, 'PAC', 150)).toBe(true);
	});

	test('drops a pack size that claims a different quantity', () => {
		expect(packSizeAgrees({ count: 12, each: false }, 'EA', null)).toBe(false);
		expect(packSizeAgrees({ count: 180, each: false }, 'BOX', 200)).toBe(false);
		expect(packSizeAgrees({ count: 10, each: false }, 'BOX', null)).toBe(false);
	});
});

describe('withoutPackSize', () => {
	test('drops a closing pack size', () => {
		expect(withoutPackSize('Spicers Copy Paper - Legal - 500 / Ream')).toBe(
			'Spicers Copy Paper - Legal'
		);
		expect(withoutPackSize('Dixon Pencils - #2 - 1 Dozen')).toBe('Dixon Pencils - #2');
		expect(withoutPackSize('Kyocera Toner - Yellow - 1 Each - 3000 Pages')).toBe(
			'Kyocera Toner - Yellow - 3000 Pages'
		);
		expect(withoutPackSize('Prang Paint - Red')).toBe('Prang Paint - Red');
	});
});
