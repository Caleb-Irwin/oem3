import words from './titleCaseWords.json';

// Etilize's spellings of words that aren't plain title case, like HP, USB, LaserJet and mL
const SPELLINGS = new Map<string, string>(Object.entries(words));
const SMALL_WORDS = new Set([
	'a',
	'an',
	'and',
	'as',
	'at',
	'by',
	'for',
	'in',
	'of',
	'on',
	'or',
	'per',
	'the',
	'to',
	'with',
	'x'
]);
// Units after a number, as in 946ML or 0.5MM. M is left out since it ends model numbers (350M).
const UNITS: Record<string, string> = {
	MM: 'mm',
	CM: 'cm',
	ML: 'mL',
	L: 'L',
	LB: 'lb',
	LBS: 'lb',
	OZ: 'oz',
	FT: 'ft',
	MIL: 'mil',
	G: 'g',
	KG: 'kg'
};
const NUMBER_UNIT = /(\d)(MM|CM|ML|LBS?|OZ|FT|MIL|KG|G|L)(?![\p{L}])/gu;
const SIZE_BY = /([\d"'])X(?=[\d"'])/g;

function caseWord(word: string, afterSpace: boolean): string {
	// Sizes and model numbers (22X28", TN436M) keep their capitals apart from units
	if (/\d/.test(word))
		return word.replace(SIZE_BY, '$1x').replace(NUMBER_UNIT, (_, n, unit) => n + UNITS[unit]);

	const lower = word.toLowerCase();
	if (afterSpace && SMALL_WORDS.has(lower)) return lower;
	const spelling = SPELLINGS.get(lower);
	if (spelling) return spelling;
	// Abbreviations without vowels, like BLK or STD
	if (!/[AEIOUY]/.test(word)) return word;
	// Capitalize the first letter, which may follow a quote
	return lower.replace(/\p{L}/u, (letter) => letter.toUpperCase());
}

/**
 * Guild's titles and Novexco's titles without Etilize content are all in capitals. Title case
 * them, keeping brands and acronyms as Etilize spells them. Other titles are returned unchanged.
 */
export function fixAllCapsTitle(title: string): string;
export function fixAllCapsTitle(title: string | null): string | null;
export function fixAllCapsTitle(title: string | null): string | null {
	if (!title || title !== title.toUpperCase() || !/\p{Lu}/u.test(title)) return title;
	return title.replace(/[\p{L}\d'&®"]+/gu, (word, offset: number) =>
		caseWord(word, offset > 0 && title[offset - 1] === ' ')
	);
}
