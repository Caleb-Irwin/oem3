import { work } from '../../../utils/workerBase';
import Papa from 'papaparse';
import { eq, inArray } from 'drizzle-orm';
import { sprFlatFileFr } from './table';
import { sprFlatFile } from '../flatFile/table';
import { genDiffer } from '../../../utils/changeset.helpers';
import { chunk } from '../../../utils/chunk';

// French content is read through sprFlatFile (like enhanced content), so changed rows also bump
// their sprFlatFile row's lastUpdated to trigger the unified Novexco worker.
work({
	process: async ({ db, message, progress, utils: { getFileDataUrl, createChangeset } }) => {
		const fileId = (message as { fileId: number }).fileId,
			dataUrl = await getFileDataUrl(fileId),
			// The file is UTF-8; atob would decode it as Latin-1 and mangle accented characters
			csv = Buffer.from(dataUrl.slice(dataUrl.indexOf('base64,') + 7), 'base64').toString('utf8'),
			rawItems = Papa.parse<FlatFileFrRaw>(csv, { header: true }).data.filter(
				(item) => item?.ProductId && item.SKU && item['SKU Type'] === 'SPRC'
			);
		// A bad or truncated file would otherwise mark all French content deleted
		if (rawItems.length === 0) throw new Error('No SPRC rows found in French flat file');

		const changeset = await createChangeset(sprFlatFileFr, fileId);

		await db.transaction(async (db) => {
			const prevItems = new Map(
				(await db.query.sprFlatFileFr.findMany({ with: { uniref: true } })).map((item) => [
					item.etilizeId,
					item
				])
			);

			await changeset.process({
				db,
				// The file can list several SPRC SKUs per product; keep one row per Etilize ID
				rawItems: Array.from(new Map(rawItems.map((item) => [item.ProductId, item])).values()),
				prevItems,
				transform: transformSprFlatFileFr,
				extractId: (item) => item.etilizeId,
				diff: genDiffer(
					[],
					[
						'sprcSku',
						'fullDescription',
						'mainTitle',
						'subTitle',
						'marketingText',
						'productSpecs',
						'keywords'
					]
				),
				progress,
				fileId
			});

			const changed = await db
				.select({ etilizeId: sprFlatFileFr.etilizeId })
				.from(sprFlatFileFr)
				.where(eq(sprFlatFileFr.lastUpdated, changeset.time));
			for (const c of chunk(changed.map((row) => row.etilizeId))) {
				await db
					.update(sprFlatFile)
					.set({ lastUpdated: Date.now() })
					.where(inArray(sprFlatFile.etilizeId, c))
					.execute();
			}
		});
	}
});

function transformSprFlatFileFr(item: FlatFileFrRaw): typeof sprFlatFileFr.$inferInsert {
	return {
		etilizeId: item.ProductId,
		sprcSku: item.SKU,
		fullDescription: item['Desc1'] || null,
		mainTitle: item['Desc2'] || null,
		subTitle: item['Desc3'] || null,
		marketingText: item['Marketing Text / Sales Copy'] || null,
		productSpecs: item['Product Specifications'] || null,
		keywords: item.keywords || null,
		lastUpdated: 0
	};
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
