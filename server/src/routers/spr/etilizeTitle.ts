/**
 * Etilize splits a title into a main title ("Prang Washable Paint") and a subtitle of specs
 * ("Red - 16 oz (453.59 g) - 1 Each"). The main title alone can't tell variants apart, so combine
 * them, dropping trailing spec segments to fit Shopify's title limit.
 */
export function etilizeTitle(
	mainTitle: string | null | undefined,
	subTitle: string | null | undefined,
	maxLength = 255
): string | null {
	const main = mainTitle?.trim();
	if (!main) return null;
	if (main.length >= maxLength) return main.slice(0, maxLength);

	let title = main;
	for (const segment of (subTitle ?? '').split(' - ')) {
		const trimmed = segment.trim();
		if (!trimmed) continue;
		const next = `${title} - ${trimmed}`;
		if (next.length > maxLength) break;
		title = next;
	}
	return title;
}
