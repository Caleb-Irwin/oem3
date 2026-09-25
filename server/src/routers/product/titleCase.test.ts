import { describe, expect, test } from 'bun:test';
import { fixAllCapsTitle } from './titleCase';

describe('fixAllCapsTitle', () => {
	test('title cases all-caps titles', () => {
		expect(fixAllCapsTitle('BINDER-OVERLAY BASICS 1.5" D-RING RED')).toBe(
			'Binder-Overlay Basics 1.5" D-Ring Red'
		);
	});

	test('keeps brands and acronyms as Etilize spells them', () => {
		expect(fixAllCapsTitle('PRINTER-HP LASERJET PRO 4001DW WIRELESS')).toBe(
			'Printer-HP LaserJet Pro 4001DW Wireless'
		);
		expect(fixAllCapsTitle('MEMORY CARD-PREMIUM SDXC 128GB')).toBe(
			'Memory Card-Premium SDXC 128GB'
		);
	});

	test('lowercases units and sizes but keeps model numbers', () => {
		expect(fixAllCapsTitle('CLEANER-CLOROX 946ML 16"X17" TN436M CHAIR 350M')).toBe(
			'Cleaner-Clorox 946mL 16"x17" TN436M Chair 350M'
		);
	});

	test('lowercases small words only mid-title', () => {
		expect(fixAllCapsTitle('FOR SALE SIGN WITH CLIP')).toBe('For Sale Sign with Clip');
		expect(fixAllCapsTitle('STAMP-"PAID" RED')).toBe('Stamp-"Paid" Red');
	});

	test('keeps abbreviations without vowels', () => {
		expect(fixAllCapsTitle('TABLE 70 X 23 BLK/NOCE')).toBe('Table 70 x 23 BLK/Noce');
	});

	test('leaves mixed-case titles alone', () => {
		expect(fixAllCapsTitle('Prang Washable Paint - RED')).toBe('Prang Washable Paint - RED');
		expect(fixAllCapsTitle('123 456')).toBe('123 456');
		expect(fixAllCapsTitle(null)).toBeNull();
	});
});
