import { work } from '../../../utils/workerBase';
import * as xlsx from 'xlsx';
import { sprPriceFile } from './table';
import { genDiffer, removeNaN } from '../../../utils/changeset.helpers';

work({
	process: async ({ db, message, progress, utils: { getFileDataUrl, createChangeset } }) => {
		const fileId = (message as { fileId: number }).fileId,
			changeset = await createChangeset(sprPriceFile, fileId),
			dataUrl = await getFileDataUrl(fileId),
			workbook = xlsx.read(dataUrl.slice(dataUrl.indexOf(';base64,') + 8)),
			worksheet = workbook.Sheets[workbook.SheetNames[0]],
			priceFileObjects = xlsx.utils.sheet_to_json(worksheet);

		await db.transaction(async (db) => {
			const prevItems = new Map(
				(await db.query.sprPriceFile.findMany({ with: { uniref: true } })).map((item) => [
					item.sprcSku,
					item
				])
			);

			await changeset.process({
				db,
				rawItems: priceFileObjects as PriceFileRaw[],
				prevItems,
				transform: transformPriceFile,
				extractId: (item) => item.sprcSku,
				diff: genDiffer(
					[],
					[
						'sprcSku',
						'etilizeId',
						'status',
						'description',
						'um',
						'upc',
						'catPage',
						'dealerNetPriceCents',
						'netPriceCents',
						'listPriceCents'
					]
				),
				progress,
				fileId
			});
		});
	}
});

function transformPriceFile(item: PriceFileRaw): typeof sprPriceFile.$inferInsert {
	return {
		sprcSku: item['SPRC SKU'].trim(),
		etilizeId:
			item['ProductID'] &&
			item['ProductID'].toString().trim() !== '' &&
			item['ProductID'].toString().trim() !== '='
				? item['ProductID'].toString().trim()
				: null,
		status: getStatus(item['Product Status']?.trim()),
		description: item.Description.trim(),
		um: getUm(item.UoM.trim()),
		upc: item.UPC?.trim() ?? null,
		catPage: removeNaN(Math.round(parseFloat(item['Cat. Page'] as string))),
		dealerNetPriceCents: removeNaN(
			Math.round(
				parseFloat(
					item[
						Object.keys(item).filter((key) =>
							key.endsWith('Dealer Net Price')
						)[0] as 'Dealer Net Price'
					] as string
				) * 100
			)
		) as number,
		netPriceCents: removeNaN(Math.round(parseFloat(item['Net Price'] as string) * 100)) as number,
		listPriceCents: removeNaN(Math.round(parseFloat(item['List Price'] as string) * 100)) as number,
		lastUpdated: 0
	};
}

function getStatus(status: string): 'Active' | 'Discontinued' | 'Not available' | null {
	if (['Active', 'Discontinued', 'Not available'].includes(status))
		return status as 'Active' | 'Discontinued' | 'Not available';
	return null;
}

function getUm(um: string): 'EA' | 'PAC' | 'BOX' | null {
	if (['EA', 'PAC', 'BOX'].includes(um)) return um as 'EA' | 'PAC' | 'BOX';
	return null;
}

interface PriceFileRaw {
	'SPRC SKU': string;
	ProductID: string;
	'Product Status': string;
	Description: string;
	UoM: string;
	UPC: string;
	'Cat. Page': number | unknown;
	'Dealer Net Price': number | unknown;
	'Net Price': number | unknown;
	'List Price': number | unknown;
}
