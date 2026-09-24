import { work } from '../../../utils/workerBase';
import * as xlsx from 'xlsx';
import { sprPriceFile } from './table';
import { sprSkus } from '../enhancedContent/table';
import { genDiffer, removeNaN } from '../../../utils/changeset.helpers';
import { inArray } from 'drizzle-orm';
import { findDuplicates } from './duplicates';

work({
	process: async ({ db, message, progress, utils: { getFileDataUrl, createChangeset } }) => {
		const fileId = (message as { fileId: number }).fileId,
			changeset = await createChangeset(sprPriceFile, fileId),
			dataUrl = await getFileDataUrl(fileId),
			workbook = xlsx.read(dataUrl.slice(dataUrl.indexOf(';base64,') + 8)),
			worksheet = workbook.Sheets[workbook.SheetNames[0]],
			priceFileObjects = (xlsx.utils.sheet_to_json(worksheet) as PriceFileRaw[]).filter(
				(item) => clean(item['Novexco Product Code']) !== null
			);

		// Etilize IDs come from the Etilize SKU mappings (refreshed by the enhanced content worker)
		const etilizeByNovexco = new Map<string, string>(),
			etilizeBySprc = new Map<string, string>();
		(
			await db
				.select()
				.from(sprSkus)
				.where(inArray(sprSkus.type, ['NOVEXCO', 'SPRC']))
				// Deterministic when a SKU maps to several Etilize IDs, so re-imports do not flip them
				.orderBy(sprSkus.etilizeId)
				.execute()
		).forEach(({ type, sku, etilizeId }) => {
			const map = type === 'NOVEXCO' ? etilizeByNovexco : etilizeBySprc;
			if (!map.has(sku)) map.set(sku, etilizeId);
		});

		const items = priceFileObjects.map((item) =>
			transformPriceFile(item, etilizeByNovexco, etilizeBySprc)
		);
		findDuplicates(items);

		await db.transaction(async (db) => {
			const prevItems = new Map(
				(await db.query.sprPriceFile.findMany({ with: { uniref: true } })).map((item) => [
					item.novexcoCode ?? `legacy:${item.id}`,
					item
				])
			);
			adoptLegacyRows(prevItems, priceFileObjects);

			await changeset.process({
				db,
				rawItems: items,
				prevItems,
				transform: (item) => item,
				extractId: (item) => item.novexcoCode!,
				diff: genDiffer(
					['inventory'],
					[
						'novexcoCode',
						'sprcSku',
						'guildCode',
						'cws',
						'etilizeId',
						'status',
						'warehouseStatus',
						'directStatus',
						'description',
						'descriptionFr',
						'categoryDescription',
						'supplierName',
						'supplierSku',
						'um',
						'unitsPerPack',
						'upc',
						'catPage',
						'dealerNetPriceCents',
						'directCostCents',
						'netPriceCents',
						'listPriceCents',
						'inventory',
						'duplicateOf',
						'duplicateCodes'
					]
				),
				progress,
				fileId
			});
		});
	}
});

/**
 * Rows imported from the old SPR price file have no Novexco code. Re-key them under the
 * Novexco code that now carries their SPR code (when that code is unambiguous) so they are
 * updated in place, keeping their ids and unified connections.
 */
function adoptLegacyRows(
	prevItems: Map<string, typeof sprPriceFile.$inferSelect & object>,
	rawItems: PriceFileRaw[]
) {
	const novexcoBySprc = new Map<string, string | null>();
	for (const item of rawItems) {
		const sprc = clean(item['SPR Product Code']),
			novexco = clean(item['Novexco Product Code'])!;
		if (sprc) novexcoBySprc.set(sprc, novexcoBySprc.has(sprc) ? null : novexco);
	}

	for (const [key, item] of Array.from(prevItems)) {
		if (item.novexcoCode !== null || item.sprcSku === null) continue;
		const novexco = novexcoBySprc.get(item.sprcSku);
		if (!novexco || prevItems.has(novexco)) continue;
		prevItems.delete(key);
		prevItems.set(novexco, item);
	}
}

function transformPriceFile(
	item: PriceFileRaw,
	etilizeByNovexco: Map<string, string>,
	etilizeBySprc: Map<string, string>
): typeof sprPriceFile.$inferInsert {
	const novexcoCode = clean(item['Novexco Product Code'])!,
		sprcSku = clean(item['SPR Product Code']),
		warehouseStatus = clean(item['Warehousing Purchasing Status']),
		directStatus = clean(item['Direct Purchasing Status']),
		inventory = [
			'Laval Inventory',
			'Calgary Inventory',
			'Halifax Inventory',
			'Surrey Inventory',
			'Brampton Inventory'
		].map((key) => toInt(item[key as keyof PriceFileRaw]));

	return {
		novexcoCode,
		sprcSku,
		guildCode: clean(item['GUILD Product Code']),
		cws: clean(item['CWS Number']),
		etilizeId:
			etilizeByNovexco.get(novexcoCode) ?? (sprcSku ? etilizeBySprc.get(sprcSku) : null) ?? null,
		status: getStatus(warehouseStatus ?? directStatus),
		warehouseStatus,
		directStatus,
		description: clean(item['English Short Description']),
		descriptionFr: clean(item['French Short Description']),
		categoryDescription: clean(item['Product Category Description']),
		supplierName: clean(item['Supplier name']),
		supplierSku: clean(item['Supplier Product Code Number']),
		um: getUm(clean(item['English Unit of Measure'])),
		unitsPerPack: toInt(item['Number of units per pack or box']),
		upc: clean(item['UPC 1 - Unit Pack']),
		catPage: toInt(item['Catalogue Page']),
		dealerNetPriceCents: toCents(item['Unit Cost']),
		directCostCents: toCents(item['Direct Cost']),
		netPriceCents: toCents(item['Net Price']),
		listPriceCents: toCents(item['Retail Price']),
		inventory: inventory.every((v) => v === null)
			? null
			: inventory.reduce<number>((sum, v) => sum + (v ?? 0), 0),
		duplicateOf: null,
		duplicateCodes: null,
		lastUpdated: 0
	};
}

/** Novexco pads every cell with spaces, and uses whitespace-only cells for blanks */
function clean(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	const str = value.toString().trim();
	return str === '' ? null : str;
}

function toInt(value: unknown): number | null {
	const str = clean(value);
	return str === null ? null : removeNaN(Math.round(parseFloat(str)));
}

function toCents(value: unknown): number | null {
	const str = clean(value);
	return str === null ? null : removeNaN(Math.round(parseFloat(str) * 100));
}

// Warehousing purchasing status codes (Direct purchasing status codes are the same set)
const statusMap: { [code: string]: 'Active' | 'Discontinued' | 'Not available' } = {
	AC: 'Active',
	// Novexco discontinued, but available while quantities last
	DS: 'Active',
	// Vendor discontinued
	DF: 'Discontinued',
	// Inactive
	IN: 'Discontinued',
	IF: 'Discontinued',
	ID: 'Discontinued',
	NC: 'Discontinued',
	// Not available
	ND: 'Not available',
	BS: 'Not available'
};

function getStatus(code: string | null): 'Active' | 'Discontinued' | 'Not available' | null {
	return code ? (statusMap[code] ?? null) : null;
}

const umMap: { [um: string]: 'EA' | 'PAC' | 'BOX' } = {
	EA: 'EA',
	PAK: 'PAC',
	BTE: 'BOX'
};

function getUm(um: string | null): 'EA' | 'PAC' | 'BOX' | null {
	return um ? (umMap[um] ?? null) : null;
}

interface PriceFileRaw {
	'Novexco Product Code': string;
	'Product Category Description': string;
	'Number of units per pack or box': number | string;
	'Catalogue Page': string;
	'SPR Product Code': string;
	'GUILD Product Code': string;
	'French Short Description': string;
	'English Short Description': string;
	'Supplier name': string;
	'Supplier Product Code Number': string;
	'English Unit of Measure': string;
	'Direct Cost': number | string;
	'Retail Price': number | string;
	'Unit Cost': number | string;
	'Warehousing Purchasing Status': string;
	'Direct Purchasing Status': string;
	'UPC 1 - Unit Pack': string;
	'Net Price': number | string;
	'Laval Inventory': number | string;
	'Calgary Inventory': number | string;
	'Halifax Inventory': number | string;
	'Surrey Inventory': number | string;
	'Brampton Inventory': number | string;
	'CWS Number': string;
}
