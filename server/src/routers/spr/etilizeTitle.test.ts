import { describe, expect, test } from 'bun:test';
import { etilizeTitle } from './etilizeTitle';

describe('etilizeTitle', () => {
	test('adds the subtitle so variants can be told apart', () => {
		expect(etilizeTitle('Prang Washable Paint', 'Red - 16 oz (453.59 g) - 1 Each')).toBe(
			'Prang Washable Paint - Red - 16 oz (453.59 g) - 1 Each'
		);
	});

	test('drops trailing spec segments that do not fit', () => {
		expect(etilizeTitle('Woods Power Extension Cord', '125 V AC - Off White - 14 ft', 45)).toBe(
			'Woods Power Extension Cord - 125 V AC'
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
});
