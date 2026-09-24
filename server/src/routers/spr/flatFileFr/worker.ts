import { work } from '../../../utils/workerBase';
import Papa from 'papaparse';
import { inArray, sql } from 'drizzle-orm';
import { sprFlatFileFr } from './table';
import { sprFlatFile } from '../flatFile/table';
import { chunk } from '../../../utils/chunk';

const contentKeys = [
	'sprcSku',
	'fullDescription',
	'mainTitle',
	'subTitle',
	'marketingText',
	'productSpecs',
	'keywords'
] as const;

// No changeset: French content is only read through sprFlatFile (like enhanced content), so
// changed rows bump their sprFlatFile row's lastUpdated to trigger the unified Novexco worker.
work({
	process: async ({ db, message, progress, utils: { getFileDataUrl } }) => {
		const fileId = (message as { fileId: number }).fileId,
			dataUrl = await getFileDataUrl(fileId),
			// The file is UTF-8; atob would decode it as Latin-1 and mangle accented characters
			csv = Buffer.from(dataUrl.slice(dataUrl.indexOf('base64,') + 7), 'base64').toString('utf8'),
			res = Papa.parse<FlatFileFrRaw>(csv, { header: true }),
			lastUpdated = Date.now(),
			next = new Map<string, typeof sprFlatFileFr.$inferInsert>();

		for (const item of res.data) {
			if (!item?.ProductId || !item.SKU || item['SKU Type'] !== 'SPRC') continue;
			next.set(item.ProductId, {
				etilizeId: item.ProductId,
				sprcSku: item.SKU,
				fullDescription: item['Desc1'] || null,
				mainTitle: item['Desc2'] || null,
				subTitle: item['Desc3'] || null,
				marketingText: item['Marketing Text / Sales Copy'] || null,
				productSpecs: item['Product Specifications'] || null,
				keywords: item.keywords || null,
				lastUpdated
			});
		}
		// A bad or truncated file would otherwise delete all French content
		if (next.size === 0) throw new Error('No SPRC rows found in French flat file');
		progress(0.2);

		await db.transaction(async (db) => {
			const prev = new Map(
				(await db.select().from(sprFlatFileFr).execute()).map((row) => [row.etilizeId, row])
			);

			const changed = Array.from(next.values()).filter((row) => {
				const p = prev.get(row.etilizeId);
				return !p || contentKeys.some((key) => p[key] !== row[key]);
			});
			const removed = Array.from(prev.keys()).filter((etilizeId) => !next.has(etilizeId));
			progress(0.4);

			for (const c of chunk(removed)) {
				await db.delete(sprFlatFileFr).where(inArray(sprFlatFileFr.etilizeId, c)).execute();
			}
			for (const c of chunk(changed)) {
				await db
					.insert(sprFlatFileFr)
					.values(c)
					.onConflictDoUpdate({
						target: sprFlatFileFr.etilizeId,
						set: Object.fromEntries(
							[...contentKeys, 'lastUpdated'].map((key) => [key, sqlExcluded(key)])
						)
					})
					.execute();
			}
			progress(0.7);

			for (const c of chunk([...changed.map((row) => row.etilizeId), ...removed])) {
				await db
					.update(sprFlatFile)
					.set({ lastUpdated: Date.now() })
					.where(inArray(sprFlatFile.etilizeId, c))
					.execute();
			}
		});
		progress(1);
	}
});

function sqlExcluded(column: string) {
	return sql.raw(`excluded."${column}"`);
}

interface FlatFileFrRaw {
	ProductId: string;
	'SKU Type': string;
	SKU: string;
	Desc1: string;
	Desc2: string;
	Desc3: string;
	'Marketing Text / Sales Copy': string;
	keywords: string;
	'Product Specifications': string;
}
