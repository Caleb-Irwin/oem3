const SHOPIFY_TITLE_LIMIT = 255;

// Etilize's pack size, usually closing the subtitle: "1 Each", "12 / Pack", "1 Dozen", "500 / Ramette"
const PACK_SIZE =
	/^(\d+) (?:\/ )?(each|chaque|dozen|douzaine|pack|package|box|carton|case|set|kit|pair|roll|ream|bag|tube|tub|bottle|can|jar|pad|book|sheet|bundle|piece|pièce|emballage|paquet|boîte|jeu|ensemble|rouleau|ramette|étui|sac|caisse|paire|bouteille)s?$/i;
const PACK_SIZE_SEGMENT = new RegExp(` - ${PACK_SIZE.source.slice(1, -1)}(?= - |$)`, 'gi');

export type PackSize = { count: number; each: boolean };

function parsePackSize(segment: string): PackSize | null {
	const match = segment.match(PACK_SIZE);
	if (!match) return null;
	const unit = match[2].toLowerCase();
	const dozen = unit === 'dozen' || unit === 'douzaine';
	return {
		count: Number(match[1]) * (dozen ? 12 : 1),
		each: dozen || unit === 'each' || unit === 'chaque'
	};
}

/**
 * Whether Etilize's pack size agrees with how Novexco sells the item, by the each (EA) or as a
 * pack or box of unitsPerPack. "1 Each" is left out regardless, since it says nothing.
 */
export function packSizeAgrees(
	{ count, each }: PackSize,
	um: string | null | undefined,
	unitsPerPack: number | null | undefined
): boolean {
	if (count === 1 && each) return false;
	if (um === 'EA') return count === 1;
	// One pack, box or carton of however many Novexco sells
	if (count === 1 && !each) return true;
	return count === unitsPerPack;
}

/** Whether text has the phrase as whole words, ignoring case */
function containsWords(text: string, phrase: string): boolean {
	const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`(?<![\\p{L}\\d])${escaped}(?![\\p{L}\\d])`, 'iu').test(text);
}

/**
 * Etilize splits a title into a main title ("Prang Washable Paint") and a subtitle of specs
 * ("Red - 16 oz (453.59 g) - 1 Each"). The main title alone can't tell variants apart, so combine
 * them, adding the spec segments that keep the title short enough to fit product cards. The pack
 * size is only added when keepPackSize accepts it, so a title never claims a different quantity
 * from what's sold.
 */
export function etilizeTitle(
	mainTitle: string | null | undefined,
	subTitle: string | null | undefined,
	keepPackSize: (packSize: PackSize) => boolean = () => true,
	maxLength = 90
): string | null {
	const unwanted = (segment: string) => {
		const packSize = parsePackSize(segment);
		return !!packSize && !keepPackSize(packSize);
	};
	// Some main titles carry the pack size too: "Kyocera Toner Cartridge - Yellow - 1 Each"
	const main = mainTitle
		?.split(' - ')
		.filter((segment) => !unwanted(segment.trim()))
		.join(' - ')
		.trim();
	if (!main) return null;
	if (main.length >= SHOPIFY_TITLE_LIMIT) return main.slice(0, SHOPIFY_TITLE_LIMIT);

	let title = main;
	const seen = new Set<string>();
	for (const segment of (subTitle ?? '').split(' - ')) {
		const trimmed = segment.trim();
		// Etilize repeats specs, as in "Black - Laser - 60000 Pages - Black", or repeats the main
		// title, as in "Duracell Coppertop Alkaline AA Batteries - AA"
		if (!trimmed || seen.has(trimmed.toLowerCase()) || containsWords(main, trimmed)) continue;
		seen.add(trimmed.toLowerCase());
		if (unwanted(trimmed)) continue;
		const next = `${title} - ${trimmed}`;
		if (next.length <= maxLength) title = next;
	}
	return title;
}

/** Drops the pack size etilizeTitle may have added to a title */
export function withoutPackSize(title: string): string {
	return title.replace(PACK_SIZE_SEGMENT, '');
}
