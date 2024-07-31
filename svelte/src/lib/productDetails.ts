import type { qb as qbTable, guild as guildTable } from '../../../server/src/db.schema';

export interface RawProduct {
	qbData: typeof qbTable.$inferSelect | null;
	guildData: typeof guildTable.$inferSelect | null;
}

export interface Product {
	idText: string;
	name: string;
	price: string;
	sku: string;
	stock: number | null;
	deleted: boolean;
	description: string | undefined;
	imageUrl: string | undefined;
	lastUpdated: number;
	other: { [key: string]: string | null };
}

export const productDetails = (raw: RawProduct): Product | undefined => {
	const { format } = new Intl.NumberFormat('en-CA', {
		style: 'currency',
		currency: 'CAD'
	});
	if (raw.qbData) {
		const qb = raw.qbData;
		return {
			idText: 'QB#' + qb.id,
			name: qb.desc,
			price: format(qb.priceCents / 100),
			sku: qb.qbId,
			stock: qb.quantityOnHand,
			deleted: qb.deleted,
			description: undefined,
			imageUrl: undefined,
			lastUpdated: qb.lastUpdated,
			other: {
				Cost: format(qb.costCents / 100),
				'Unit of Measure': qb.um,
				Account: qb.account,
				Vendor: qb.preferredVendor,
				'Quantity On PO': qb.quantityOnPurchaseOrder ? qb.quantityOnPurchaseOrder.toString() : null,
				'Quantity On SO': qb.quantityOnSalesOrder ? qb.quantityOnSalesOrder.toString() : null,
				'Sales Tax Code': qb.salesTaxCode,
				Type: qb.type
			}
		};
	}
	if (raw.guildData) {
		const guild = raw.guildData;
		return {
			idText: 'Guild#' + guild.id,
			name: guild.shortDesc,
			price: format(guild.priceL1Cents / 100),
			sku: guild.gid,
			stock: null,
			deleted: guild.deleted,
			description: guild.longDesc,
			imageUrl: guild.imageURL ?? undefined,
			lastUpdated: guild.lastUpdated,
			other: {
				'Basics Number': guild.basics,
				'SPR Number': guild.spr,
				'CIS Number': guild.cis,
				'Unit of Measure': guild.um,
				'Standard Pack Quantity': guild.standardPackQty.toString(),
				'Master Pack Quantity': guild.masterPackQty.toString(),
				'L0 Price': format(guild.priceL0Cents / 100),
				'Retail Price': format(guild.priceL1Cents / 100),
				'Warehouse Cost': format(guild.memberPriceCents / 100),
				'Dropship Cost': format(guild.dropshipPriceCents / 100),
				Weight: guild.weightGrams + ' grams',
				'Freight Flag': guild.freightFlag ? 'Yes' : 'No',
				'Heavy Goods Charge (SK)': format(guild.heavyGoodsChargeSkCents / 100),
				'Web Category': guild.webCategory.toString(),
				'Web Category Description':
					guild.webCategory1Desc +
					' > ' +
					guild.webCategory2Desc +
					' > ' +
					guild.webCategory3Desc +
					' > ' +
					guild.webCategory4Desc
			}
		};
	}
};
