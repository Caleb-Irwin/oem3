import type { qb as qbTable } from '../../../server/src/db.schema';

export interface RawProduct {
	qbData: typeof qbTable.$inferSelect | null;
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
	other: { [key: string]: string };
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
				'Unit of Measure': qb.um ?? 'Not specified',
				Account: qb.account,
				Vendor: qb.preferredVendor ?? '',
				'Quantity On PO': (qb.quantityOnPurchaseOrder ?? 0).toString(),
				'Quantity On SO': (qb.quantityOnSalesOrder ?? 0).toString(),
				'Sales Tax Code': qb.salesTaxCode ?? '',
				Type: qb.type
			}
		};
	}
};
