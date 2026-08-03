type FlyerSourceFile = {
	name: string;
	lastModified: number | null;
	filenameDate: number | null;
	order: number;
};

const flyerFileNamePattern = /TCC_Flyer_File\.xlsx$/i;
const sourceFileLinkPattern = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
const modifiedDatePattern =
	/<td\b[^>]*\balign\s*=\s*["']right["'][^>]*>\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)/i;

const decodeHtmlEntities = (value: string) =>
	value
		.replaceAll('&amp;', '&')
		.replaceAll('&#x2B;', '+')
		.replaceAll('&#43;', '+')
		.replaceAll('&quot;', '"');

const getFilenameDate = (fileName: string) => {
	const match = decodeURIComponent(fileName).match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
	if (!match) return null;

	return Number(`${match[1]}${match[2]}${match[3] ?? '00'}`);
};

const getLastModified = (directoryHtml: string, linkEnd: number) => {
	const rowEnd = directoryHtml.indexOf('</tr>', linkEnd);
	if (rowEnd === -1) return null;

	const row = directoryHtml.slice(linkEnd, rowEnd),
		match = row.match(modifiedDatePattern);
	if (!match) return null;

	const timestamp = Date.parse(match[1].replace(' ', 'T') + 'Z');
	return Number.isNaN(timestamp) ? null : timestamp;
};

const compareFiles = (a: FlyerSourceFile, b: FlyerSourceFile) => {
	if (a.lastModified !== null && b.lastModified !== null && a.lastModified !== b.lastModified)
		return a.lastModified - b.lastModified;
	if (a.lastModified !== null && b.lastModified === null) return 1;
	if (a.lastModified === null && b.lastModified !== null) return -1;

	if (a.filenameDate !== null && b.filenameDate !== null && a.filenameDate !== b.filenameDate)
		return a.filenameDate - b.filenameDate;
	if (a.filenameDate !== null && b.filenameDate === null) return 1;
	if (a.filenameDate === null && b.filenameDate !== null) return -1;

	// Apache normally returns this directory in newest-first order. Keep that
	// order as the final tie-breaker when the listing has no usable metadata.
	return b.order - a.order;
};

export const getLatestFlyerFileName = (directoryHtml: string) => {
	const candidates: FlyerSourceFile[] = [];

	for (const match of directoryHtml.matchAll(sourceFileLinkPattern)) {
		const href = decodeHtmlEntities(match[1]),
			name = href.slice(href.lastIndexOf('/') + 1).split('?')[0];

		if (!flyerFileNamePattern.test(name)) continue;

		candidates.push({
			name,
			lastModified: getLastModified(directoryHtml, (match.index ?? 0) + match[0].length),
			filenameDate: getFilenameDate(name),
			order: candidates.length
		});
	}

	return candidates.sort(compareFiles).at(-1)?.name ?? null;
};
