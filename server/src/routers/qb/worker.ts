import { work } from '../../utils/workerBase';
import Papa from 'papaparse';
import { qb, qbInventoryHistory, qbItemTypeEnum, qbUmEnum, taxCodeEnum } from '../../db.schema';
import { enforceEnum, genDiffer, removeNaN } from '../../utils/changeset.helpers';
import { eq } from 'drizzle-orm';

work({
	process: async ({ db, progress, message, utils: { createChangeset, getFileDataUrl } }) => {
		const fileId = (message as { fileId: number }).fileId,
			changeset = await createChangeset(qb, fileId),
			dataUrl = await getFileDataUrl(fileId),
			res = Papa.parse(atob(dataUrl.slice(dataUrl.indexOf('base64,') + 7)), {
				header: true
			});

		await db.transaction(async (db) => {
			const prevItems = new Map(
				(await db.query.qb.findMany({ with: { uniref: true } })).map((item) => [item.qbId, item])
			);

			await changeset.process<
				QbItemRaw,
				typeof qb.$inferInsert,
				Exclude<ReturnType<typeof prevItems.get>, undefined>
			>({
				db,
				rawItems: (res.data as QbItemRaw[]).filter((item) => item.Type === 'Inventory Part'),
				prevItems,
				transform: transformQBItem,
				extractId: (item) => item.qbId,
				diff: genDiffer(
					['quantityOnHand', 'quantityOnPurchaseOrder', 'quantityOnSalesOrder'],
					[
						'productName',
						'upc',
						'shortUpc',
						'desc',
						'type',
						'costCents',
						'priceCents',
						'salesTaxCode',
						'purchaseTaxCode',
						'quantityOnHand',
						'quantityOnSalesOrder',
						'quantityOnPurchaseOrder',
						'um',
						'account',
						'preferredVendor'
					]
				),
				progress,
				fileId
			});

			const recordedAt = Date.now();
			const currentInventory = await db
				.select({
					qbRow: qb.id,
					quantityOnHand: qb.quantityOnHand,
					quantityOnSalesOrder: qb.quantityOnSalesOrder,
					quantityOnPurchaseOrder: qb.quantityOnPurchaseOrder
				})
				.from(qb)
				.where(eq(qb.deleted, false));

			// Keep inserts below PostgreSQL's parameter limit for larger item files.
			for (let start = 0; start < currentInventory.length; start += 5000) {
				await db
					.insert(qbInventoryHistory)
					.values(
						currentInventory.slice(start, start + 5000).map((item) => ({
							...item,
							sourceFile: fileId,
							recordedAt
						}))
					)
					.onConflictDoNothing({
						target: [qbInventoryHistory.qbRow, qbInventoryHistory.sourceFile]
					});
			}
		});
	}
});

const upcRegex = /^\d+$/,
	validUpcLengths = [8, 12, 13, 14];

const transformQBItem = (item: QbItemRaw): typeof qb.$inferInsert => {
	const qbId = item.Item,
		productName = qbId.indexOf(':') ? qbId.slice(qbId.indexOf(':') + 1).trim() : qbId.trim();

	const isValidUpc = validUpcLengths.includes(productName.length) && upcRegex.test(productName);
	const upc = isValidUpc ? productName : null;

	const shortUpc = upc && upc.length >= 12 ? upc.slice(upc.length - 11, upc.length - 1) : null;

	return {
		qbId: qbId,
		productName,
		upc,
		shortUpc,
		desc: item.Description,
		type: item.Type as (typeof qbItemTypeEnum.enumValues)[number],
		costCents: removeNaN(Math.round(100 * parseFloat(item.Cost) || -1)) ?? -1,
		priceCents: removeNaN(Math.round(100 * parseFloat(item.Price) || -1)) ?? -1,
		salesTaxCode: enforceEnum(item['Sales Tax Code'], taxCodeEnum.enumValues),
		purchaseTaxCode: enforceEnum(item['Purchase Tax Code'], taxCodeEnum.enumValues),
		quantityOnSalesOrder: removeNaN(parseInt(item['Quantity On Sales Order'])),
		quantityOnPurchaseOrder: removeNaN(parseInt(item['Quantity On Purchase Order'])),
		um: getUM(item['U/M']),
		account: item.Account,
		quantityOnHand: removeNaN(parseInt(item['Quantity On Hand'])),
		preferredVendor: item['Preferred Vendor'],
		lastUpdated: 0
	};
};

const getUM = (umStr: string): (typeof qbUmEnum.enumValues)[number] | null => {
	const um = umStr.toLowerCase();
	if (um.includes('ea')) return 'ea';
	if (um.includes('pk')) return 'pk';
	if (um.includes('cs')) return 'cs';
	return null;
};

export interface QbItemRaw {
	Item: string;
	Description: string;
	Type: string;
	Cost: string;
	Price: string;
	'Sales Tax Code': string;
	'Purchase Tax Code': string;
	'Quantity On Sales Order': string;
	'Reorder Pt (Min)': string;
	'Quantity On Purchase Order': string;
	'U/M Set': string;
	Account: string;
	'Quantity On Hand': string;
	'U/M': string;
	'Preferred Vendor': string;
}
