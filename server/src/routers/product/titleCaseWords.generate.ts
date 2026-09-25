/**
 * Builds titleCaseWords.json, Etilize's spellings of words that aren't plain title case (HP, USB,
 * LaserJet, mL), from the Novexco flat file. Rerun when the flat file gains many new brands:
 * bun src/routers/product/titleCaseWords.generate.ts
 */
import { db } from '../../db';
import { sprFlatFile } from '../spr/flatFile/table';

// A spelling must make up this share of a word's uses, so one shouted product name doesn't count
const MIN_SHARE = 0.6;
const MIN_USES = 3;
// Short words Etilize capitalizes in a few shouted names, but which are plain words in titles
const PLAIN_WORDS = new Set([
	'ad',
	'am',
	'an',
	'era',
	'ha',
	'he',
	'hop',
	'if',
	'mod',
	'oh',
	'par',
	'van'
]);
// Etilize's spelling is wrong for our titles
const OVERRIDES: Record<string, string | null> = {
	basics: null // Novexco's Basics brand, which Etilize shouts
};

// Longer English words spelled in capitals are shouted names (VALLEY, RECEIVED), not acronyms
const dictionary = Bun.file('/usr/share/dict/words');
const englishWords = (await dictionary.exists())
	? new Set((await dictionary.text()).toLowerCase().split('\n'))
	: (console.warn('No /usr/share/dict/words, so shouted English words are kept'),
		new Set<string>());

const rows = await db
	.select({ mainTitle: sprFlatFile.mainTitle, subTitle: sprFlatFile.subTitle })
	.from(sprFlatFile);

const uses = new Map<string, Map<string, number>>();
for (const row of rows) {
	for (const word of `${row.mainTitle ?? ''} ${row.subTitle ?? ''}`.match(/[\p{L}'&®]+/gu) ?? []) {
		const key = word.toLowerCase();
		const spellings = uses.get(key) ?? new Map<string, number>();
		spellings.set(word, (spellings.get(word) ?? 0) + 1);
		uses.set(key, spellings);
	}
}

const words: Record<string, string> = {};
for (const [key, spellings] of uses) {
	if (key.length < 2 || PLAIN_WORDS.has(key)) continue;
	const total = [...spellings.values()].reduce((sum, count) => sum + count, 0);
	const [spelling, count] = [...spellings].sort((a, b) => b[1] - a[1])[0];
	if (total < MIN_USES || count / total < MIN_SHARE) continue;
	// Plain words are title cased anyway
	if (spelling === key || spelling === key[0].toUpperCase() + key.slice(1)) continue;
	if (key.length >= 4 && spelling === key.toUpperCase() && englishWords.has(key)) continue;
	words[key] = spelling;
}
for (const [key, spelling] of Object.entries(OVERRIDES)) {
	if (spelling) words[key] = spelling;
	else delete words[key];
}

const sorted = Object.fromEntries(Object.entries(words).sort(([a], [b]) => a.localeCompare(b)));
await Bun.write(
	new URL('./titleCaseWords.json', import.meta.url),
	JSON.stringify(sorted, null, '\t') + '\n'
);
console.log(`Wrote ${Object.keys(sorted).length} spellings`);
process.exit(0);
