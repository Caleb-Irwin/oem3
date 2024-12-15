import type { client } from './client';

export type RawProduct = Exclude<Awaited<ReturnType<typeof client.resources.get.query>>, null>;

export interface Product {
	idText: string;
	id: number;
	name: string;
	price: string;
	comparePrice?: string | null;
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
			id: qb.id,
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
			id: guild.id,
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
	if (raw.guildInventoryData) {
		const inventory = raw.guildInventoryData;
		return {
			idText: 'GuildInventory#' + inventory.id,
			id: inventory.id,
			name: inventory.gid,
			sku: inventory.sku ?? 'Unknown',
			price: '',
			deleted: inventory.deleted,
			stock: inventory.onHand,
			lastUpdated: inventory.lastUpdated,
			description: undefined,
			imageUrl: undefined,
			other: {
				'UPC#': inventory.upc,
				'SPR#': inventory.spr,
				'Basics#': inventory.basics,
				'CIS#': inventory.cis,
				'Unit of Measure': inventory.um,
				'Qty/UoM': inventory.qtyPerUm ? inventory.qtyPerUm.toString() : null
			}
		};
	}
	if (raw.guildFlyerData) {
		const flyer = raw.guildFlyerData;
		return {
			idText: 'GuildFlyer#' + flyer.id,
			id: flyer.id,
			name: flyer.gid,
			sku: flyer.gid,
			price: format((flyer.flyerPriceL1Cents as number) / 100),
			comparePrice: format((flyer.regularPriceL1Cents as number) / 100),
			stock: null,
			deleted: flyer.deleted,
			lastUpdated: flyer.lastUpdated,
			description: undefined,
			imageUrl: undefined,
			other: {
				'Start Date': new Date(flyer.startDate as number).toLocaleDateString('en-CA'),
				'End Date': new Date(flyer.endDate as number).toLocaleDateString('en-CA'),
				'Flyer Number': flyer.flyerNumber?.toString() ?? '',
				'Vendor Code': flyer.vendorCode,
				'Flyer Cost': format((flyer.flyerCostCents as number) / 100),
				'Flyer Price L0': format((flyer.flyerPriceL0Cents as number) / 100),
				'Flyer Price Retail': format((flyer.flyerPriceRetailCents as number) / 100),
				'Regular Price L0': format((flyer.regularPriceL0Cents as number) / 100)
			}
		};
	}
	if (raw.shopifyData) {
		const shopify = raw.shopifyData;
		return {
			idText: 'Shopify#' + shopify.id,
			id: shopify.id,
			name: shopify.title,
			price: format(shopify.vPriceCents / 100),
			sku: shopify.vSku ?? 'Unknown',
			stock: shopify.totalInventory,
			deleted: shopify.deleted,
			lastUpdated: shopify.lastUpdated,
			description: shopify.htmlDescription ?? '',
			imageUrl: shopify.imageUrl ?? undefined,
			other: {
				Handle: shopify.handle,
				Status: shopify.status,
				'Compare At Price': shopify.vComparePriceCents
					? format(shopify.vComparePriceCents / 100)
					: 'Not on sale',
				'Unit Cost': shopify.vUnitCostCents
					? format(shopify.vUnitCostCents / 100)
					: 'Not available',
				Weight: shopify.vWeightGrams + ' grams',
				'Requires Shipping': shopify.vRequiresShipping ? 'Yes' : 'No',
				'Store Available': shopify.vInventoryAvailableStore?.toString() ?? '',
				'Store On Hand': shopify.vInventoryOnHandStore?.toString() ?? '',
				'Store Committed': shopify.vInventoryCommittedStore?.toString() ?? '',
				'Warehouse On Hand': shopify.vInventoryOnHandWarehouse0?.toString() ?? '',
				Tags: JSON.parse(shopify.tagsJsonArr || '[]').join(', '),
				Barcode: shopify.vBarcode,
				'Has Only Default Variant': shopify.hasOnlyDefaultVariant ? 'Yes' : 'No',
				'Image Id': shopify.imageId,
				'Image Alt Text': shopify.imageAltText,
				'Product Id': shopify.productId,
				'Variant Id': shopify.variantId,
				'Shopify Published At': shopify.publishedAt
					? new Date(shopify.publishedAt as number).toLocaleString('en-CA')
					: 'Unknown',
				'Updated At': shopify.updatedAt
					? new Date(shopify.updatedAt as number).toLocaleString('en-CA')
					: 'Unknown'
			}
		};
	}
	if (raw.sprPriceFileData) {
		return {
			idText: 'SPRPriceFile#' + raw.sprPriceFileData.id,
			id: raw.sprPriceFileData.id,
			name: raw.sprPriceFileData.description ?? '',
			price: format(raw.sprPriceFileData.netPriceCents / 100),
			sku: raw.sprPriceFileData.sprcSku,
			stock: null,
			deleted: raw.sprPriceFileData.deleted,
			lastUpdated: raw.sprPriceFileData.lastUpdated,
			description: undefined,
			imageUrl: undefined,
			other: {
				'Dealer Net Price': format(raw.sprPriceFileData.dealerNetPriceCents / 100),
				'Net Price': format(raw.sprPriceFileData.netPriceCents / 100),
				'List Price': format(raw.sprPriceFileData.listPriceCents / 100),
				'Unit of Measure': raw.sprPriceFileData.um,
				UPC: raw.sprPriceFileData.upc,
				'Cat. Page': raw.sprPriceFileData.catPage?.toString() ?? null
			}
		};
	}
	if (raw.sprFlatFileData) {
		return {
			idText: 'SPRFlatFile#' + raw.sprFlatFileData.sprcSku,
			id: raw.sprFlatFileData.id,
			name: raw.sprFlatFileData.mainTitle ?? '',
			price: '',
			sku: raw.sprFlatFileData.sprcSku,
			stock: null,
			deleted: raw.sprFlatFileData.deleted,
			lastUpdated: raw.sprFlatFileData.lastUpdated,
			description:
				raw.sprFlatFileData.marketingText +
				'<br><br>' +
				raw.sprFlatFileData.fullDescription +
				'<br><br>' +
				raw.sprFlatFileData.productSpecs,
			imageUrl: raw.sprFlatFileData.image255 ?? raw.sprFlatFileData.image75 ?? undefined,
			other: {
				'Etilize ID': raw.sprFlatFileData.etilizeId,
				'Brand Name': raw.sprFlatFileData.brandName,
				'Product Type': raw.sprFlatFileData.productType,
				'Product Line': raw.sprFlatFileData.productLine,
				'Product Series': raw.sprFlatFileData.productSeries,
				'Sub Class Number': raw.sprFlatFileData.subClassNumber?.toString() ?? null,
				'Sub Class Name': raw.sprFlatFileData.subClassName,
				'Class Number': raw.sprFlatFileData.classNumber?.toString() ?? null,
				'Class Name': raw.sprFlatFileData.className,
				'Department Number': raw.sprFlatFileData.departmentNumber?.toString() ?? null,
				'Department Name': raw.sprFlatFileData.departmentName,
				'Master Department Number': raw.sprFlatFileData.masterDepartmentNumber?.toString() ?? null,
				'Master Department Name': raw.sprFlatFileData.masterDepartmentName,
				UNSPSC: raw.sprFlatFileData.unspsc?.toString() ?? null,
				'Manufacturer ID': raw.sprFlatFileData.manufacturerId?.toString() ?? null,
				'Manufacturer Name': raw.sprFlatFileData.manufacturerName,
				'Country Of Origin': raw.sprFlatFileData.countyOfOrigin,
				'Assembly Required': raw.sprFlatFileData.assemblyRequired ? 'Yes' : 'No',
				'Image Type 225': raw.sprFlatFileData.image255,
				'Image Type 75': raw.sprFlatFileData.image75,
				Keywords: raw.sprFlatFileData.keywords
			}
		};
	}
};
