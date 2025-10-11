import type { ResourceType } from '../../../server/src/db.schema';
import type { client } from './client';

export type RawProduct = Omit<
	Exclude<Awaited<ReturnType<typeof client.resources.get.query>>, null>,
	'history' | 'allowUnmatched'
>;

export interface Connection {
	tableName: ResourceType;
	name: string;
	connected: boolean;
	link: string;
	unmatchedVariant?: string;
}

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
	otherImageUrls?: string[] | undefined;
	lastUpdated: number;
	other: { [key: string]: string | null };
	connections?: Connection[];
	unifiedGuildData?: (RawProduct['unifiedGuildData'] & { uniref: { uniId: number } }) | null;
	unifiedSprData?: (RawProduct['unifiedSprData'] & { uniref: { uniId: number } }) | null;
	unifiedProductData?: (RawProduct['unifiedProductData'] & { uniref: { uniId: number } }) | null;
}

export const { format: formatCurrency } = new Intl.NumberFormat('en-CA', {
	style: 'currency',
	currency: 'CAD'
});

export const productDetails = (raw: RawProduct): Product | undefined => {
	if (raw.qbData) {
		const qb = raw.qbData;
		return {
			idText: 'QB#' + qb.id,
			id: qb.id,
			name: qb.desc,
			price: formatCurrency(qb.priceCents / 100),
			sku: qb.qbId,
			stock: qb.quantityOnHand,
			deleted: qb.deleted,
			description: undefined,
			imageUrl: undefined,
			lastUpdated: qb.lastUpdated,
			connections: [
				{
					tableName: 'unifiedProduct',
					name: 'Unified Product',
					connected: qb.unifiedProductData !== null,
					link: qb.unifiedProductData
						? `/app/resource/${qb.unifiedProductData.uniref.uniId}/unified`
						: '/app/product'
				}
			],
			unifiedProductData: qb.unifiedProductData ?? null,
			other: {
				UPC: qb.upc,
				'Short UPC': qb.shortUpc,
				'Product Name': qb.productName,
				Cost: formatCurrency(qb.costCents / 100),
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
			idText: 'GuildData#' + guild.id,
			id: guild.id,
			name: guild.shortDesc,
			price: formatCurrency(guild.priceL1Cents / 100),
			sku: guild.gid,
			stock: null,
			deleted: guild.deleted,
			description: guild.longDesc,
			imageUrl: guild.imageURL ?? undefined,
			lastUpdated: guild.lastUpdated,
			connections: [
				{
					tableName: 'unifiedGuild',
					name: 'Unified Guild',
					connected: guild.unifiedGuildData !== null,
					link: guild.unifiedGuildData?.id
						? `/app/resource/${guild.unifiedGuildData.uniref.uniId}/unified`
						: '/app/guild'
				},
				{
					tableName: 'unifiedProduct',
					name: 'Unified Product',
					connected:
						guild.unifiedGuildData?.unifiedProductData !== null &&
						guild.unifiedGuildData?.unifiedProductData !== undefined,
					link: guild.unifiedGuildData?.unifiedProductData
						? `/app/resource/${guild.unifiedGuildData.unifiedProductData.uniref.uniId}/unified`
						: '/app/product'
				}
			],
			unifiedGuildData: guild.unifiedGuildData ?? null,
			unifiedProductData: guild.unifiedGuildData?.unifiedProductData ?? null,
			other: {
				'Basics Number': guild.basics,
				'SPR Number': guild.spr,
				'CIS Number': guild.cis,
				'Unit of Measure': guild.um,
				'Standard Pack Quantity': guild.standardPackQty.toString(),
				'Master Pack Quantity': guild.masterPackQty.toString(),
				'L0 Price': formatCurrency(guild.priceL0Cents / 100),
				'Retail Price': formatCurrency(guild.priceL1Cents / 100),
				'Warehouse Cost': formatCurrency(guild.memberPriceCents / 100),
				'Dropship Cost': formatCurrency(guild.dropshipPriceCents / 100),
				Weight: guild.weightGrams + ' grams',
				'Freight Flag': guild.freightFlag ? 'Yes' : 'No',
				'Heavy Goods Charge (SK)': formatCurrency(guild.heavyGoodsChargeSkCents / 100),
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
			connections: [
				{
					tableName: 'unifiedGuild',
					name: 'Unified Guild',
					connected: inventory.unifiedGuildData !== null,
					link: inventory.unifiedGuildData?.id
						? `/app/resource/${inventory.unifiedGuildData.uniref.uniId}/unified`
						: '/app/guild'
				},
				{
					tableName: 'unifiedProduct',
					name: 'Unified Product',
					connected:
						inventory.unifiedGuildData?.unifiedProductData !== null &&
						inventory.unifiedGuildData?.unifiedProductData !== undefined,
					link: inventory.unifiedGuildData?.unifiedProductData
						? `/app/resource/${inventory.unifiedGuildData.unifiedProductData.uniref.uniId}/unified`
						: '/app/product'
				}
			],
			unifiedGuildData: inventory.unifiedGuildData ?? null,
			unifiedProductData: inventory.unifiedGuildData?.unifiedProductData ?? null,
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
			price: formatCurrency((flyer.flyerPriceL1Cents as number) / 100),
			comparePrice: formatCurrency((flyer.regularPriceL1Cents as number) / 100),
			stock: null,
			deleted: flyer.deleted,
			lastUpdated: flyer.lastUpdated,
			description: undefined,
			imageUrl: undefined,
			connections: [
				{
					tableName: 'unifiedGuild',
					name: 'Unified Guild',
					connected: flyer.unifiedGuildData !== null,
					link: flyer.unifiedGuildData?.id
						? `/app/resource/${flyer.unifiedGuildData.uniref.uniId}/unified`
						: '/app/guild',
					unmatchedVariant: 'variant-soft'
				},
				{
					tableName: 'unifiedProduct',
					name: 'Unified Product',
					connected:
						flyer.unifiedGuildData?.unifiedProductData !== null &&
						flyer.unifiedGuildData?.unifiedProductData !== undefined,
					link: flyer.unifiedGuildData?.unifiedProductData
						? `/app/resource/${flyer.unifiedGuildData.unifiedProductData.uniref.uniId}/unified`
						: '/app/product'
				}
			],
			unifiedGuildData: flyer.unifiedGuildData ?? null,
			unifiedProductData: flyer.unifiedGuildData?.unifiedProductData ?? null,
			other: {
				'Start Date': new Date(flyer.startDate as number).toLocaleDateString('en-CA'),
				'End Date': new Date(flyer.endDate as number).toLocaleDateString('en-CA'),
				'Flyer Number': flyer.flyerNumber?.toString() ?? '',
				'Vendor Code': flyer.vendorCode,
				'Flyer Cost': formatCurrency((flyer.flyerCostCents as number) / 100),
				'Flyer Price L0': formatCurrency((flyer.flyerPriceL0Cents as number) / 100),
				'Flyer Price Retail': formatCurrency((flyer.flyerPriceRetailCents as number) / 100),
				'Regular Price L0': formatCurrency((flyer.regularPriceL0Cents as number) / 100)
			}
		};
	}
	if (raw.shopifyData) {
		const shopify = raw.shopifyData;
		return {
			idText: 'Shopify#' + shopify.id,
			id: shopify.id,
			name: shopify.title,
			price: formatCurrency(shopify.vPriceCents / 100),
			sku: shopify.vSku ?? 'Unknown',
			stock: shopify.totalInventory,
			deleted: shopify.deleted,
			lastUpdated: shopify.lastUpdated,
			description: shopify.htmlDescription ?? '',
			imageUrl: shopify.imageUrl ?? undefined,
			connections: [
				{
					tableName: 'unifiedProduct',
					name: 'Unified Product',
					connected: shopify.unifiedProductData !== null,
					link: shopify.unifiedProductData
						? `/app/resource/${shopify.unifiedProductData.uniref.uniId}/unified`
						: '/app/product'
				}
			],
			unifiedProductData: shopify.unifiedProductData ?? null,
			other: {
				Handle: shopify.handle,
				Status: shopify.status,
				'Compare At Price': shopify.vComparePriceCents
					? formatCurrency(shopify.vComparePriceCents / 100)
					: 'Not on sale',
				'Unit Cost': shopify.vUnitCostCents
					? formatCurrency(shopify.vUnitCostCents / 100)
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
		const sprPriceFileData = raw.sprPriceFileData;
		return {
			idText: 'SPRPriceFile#' + sprPriceFileData.id,
			id: sprPriceFileData.id,
			name: sprPriceFileData.description ?? '',
			price: formatCurrency(sprPriceFileData.netPriceCents / 100),
			sku: sprPriceFileData.sprcSku,
			stock: null,
			deleted: sprPriceFileData.deleted,
			lastUpdated: sprPriceFileData.lastUpdated,
			description: undefined,
			imageUrl: sprPriceFileData.etilizeId
				? `https://content.etilize.com/225/${sprPriceFileData.etilizeId}.jpg`
				: undefined,
			unifiedSprData: sprPriceFileData.unifiedSprData,
			connections: [
				{
					tableName: 'unifiedSpr',
					name: 'Unified SPR',
					connected: sprPriceFileData.unifiedSprData !== null,
					link: sprPriceFileData.unifiedSprData
						? `/app/resource/redirect/unifiedSpr-${sprPriceFileData.unifiedSprData.id}`
						: '/app/spr'
				},
				{
					tableName: 'unifiedProduct',
					name: 'Unified Product',
					connected:
						sprPriceFileData.unifiedSprData?.unifiedProductData !== null &&
						sprPriceFileData.unifiedSprData?.unifiedProductData !== undefined,
					link: sprPriceFileData.unifiedSprData?.unifiedProductData
						? `/app/resource/${sprPriceFileData.unifiedSprData.unifiedProductData.uniref.uniId}/unified`
						: '/app/product'
				}
			],
			unifiedProductData: sprPriceFileData.unifiedSprData?.unifiedProductData ?? null,
			other: {
				'Etilize Id': sprPriceFileData.etilizeId ?? 'Null',
				'Dealer Net Price': formatCurrency(sprPriceFileData.dealerNetPriceCents / 100),
				'Net Price': formatCurrency(sprPriceFileData.netPriceCents / 100),
				'List Price': formatCurrency(sprPriceFileData.listPriceCents / 100),
				'Unit of Measure': sprPriceFileData.um,
				UPC: sprPriceFileData.upc,
				'Cat. Page': sprPriceFileData.catPage?.toString() ?? null
			}
		};
	}
	if (raw.sprFlatFileData) {
		const sprFlatFileData = raw.sprFlatFileData;
		return {
			idText: 'SPRFlatFile#' + sprFlatFileData.sprcSku,
			id: sprFlatFileData.id,
			name: sprFlatFileData.mainTitle ?? '',
			price: '',
			sku: sprFlatFileData.sprcSku,
			stock: null,
			deleted: sprFlatFileData.deleted,
			lastUpdated: sprFlatFileData.lastUpdated,
			description:
				sprFlatFileData.marketingText +
				'<br><br>' +
				sprFlatFileData.fullDescription +
				'<br><br>' +
				sprFlatFileData.productSpecs,
			imageUrl: sprFlatFileData.image255 ?? sprFlatFileData.image75 ?? undefined,
			unifiedSprData: sprFlatFileData.unifiedSprData,
			connections: [
				{
					tableName: 'unifiedSpr',
					name: 'Unified SPR',
					connected: sprFlatFileData.unifiedSprData !== null,
					link: sprFlatFileData.unifiedSprData
						? `/app/resource/redirect/unifiedSpr-${sprFlatFileData.unifiedSprData.id}`
						: '/app/spr'
				},
				{
					tableName: 'unifiedProduct',
					name: 'Unified Product',
					connected:
						sprFlatFileData.unifiedSprData?.unifiedProductData !== null &&
						sprFlatFileData.unifiedSprData?.unifiedProductData !== undefined,
					link: sprFlatFileData.unifiedSprData?.unifiedProductData
						? `/app/resource/${sprFlatFileData.unifiedSprData.unifiedProductData.uniref.uniId}/unified`
						: '/app/product'
				}
			],
			unifiedProductData: sprFlatFileData.unifiedSprData?.unifiedProductData ?? null,
			other: {
				'Etilize ID': sprFlatFileData.etilizeId,
				'Brand Name': sprFlatFileData.brandName,
				'Product Type': sprFlatFileData.productType,
				'Product Line': sprFlatFileData.productLine,
				'Product Series': sprFlatFileData.productSeries,
				'Sub Class Number': sprFlatFileData.subClassNumber?.toString() ?? null,
				'Sub Class Name': sprFlatFileData.subClassName,
				'Class Number': sprFlatFileData.classNumber?.toString() ?? null,
				'Class Name': sprFlatFileData.className,
				'Department Number': sprFlatFileData.departmentNumber?.toString() ?? null,
				'Department Name': sprFlatFileData.departmentName,
				'Master Department Number': sprFlatFileData.masterDepartmentNumber?.toString() ?? null,
				'Master Department Name': sprFlatFileData.masterDepartmentName,
				UNSPSC: sprFlatFileData.unspsc?.toString() ?? null,
				'Manufacturer ID': sprFlatFileData.manufacturerId?.toString() ?? null,
				'Manufacturer Name': sprFlatFileData.manufacturerName,
				'Country Of Origin': sprFlatFileData.countyOfOrigin,
				'Assembly Required': sprFlatFileData.assemblyRequired ? 'Yes' : 'No',
				'Image Type 225': sprFlatFileData.image255,
				'Image Type 75': sprFlatFileData.image75,
				Keywords: sprFlatFileData.keywords
			}
		};
	}
	if (raw.unifiedGuildData) {
		const unifiedGuild = raw.unifiedGuildData;
		return {
			idText: 'UnifiedGuild#' + unifiedGuild.id,
			id: unifiedGuild.id,
			name: unifiedGuild.title ?? 'No Title',
			price: unifiedGuild.priceCents ? formatCurrency(unifiedGuild.priceCents / 100) : 'No Price',
			comparePrice: unifiedGuild.comparePriceCents
				? formatCurrency(unifiedGuild.comparePriceCents / 100)
				: null,
			sku: unifiedGuild.gid,
			stock: unifiedGuild.inventory,
			deleted: unifiedGuild.deleted,
			lastUpdated: unifiedGuild.lastUpdated,
			description: unifiedGuild.description ?? undefined,
			imageUrl: unifiedGuild.imageUrl ?? undefined,
			otherImageUrls: (
				JSON.parse(unifiedGuild.otherImageListJSON ?? '[]') as {
					url: string;
					description: string;
				}[]
			).map(({ url }) => url),
			connections: [
				{
					tableName: 'guildData',
					name: 'Data',
					connected: unifiedGuild.dataRow !== null,
					link: unifiedGuild.dataRow
						? `/app/resource/redirect/guildData-${unifiedGuild.dataRow}`
						: '/app/guild'
				},
				{
					tableName: 'guildInventory',
					name: 'Inventory',
					connected: unifiedGuild.inventoryRow !== null,
					link: unifiedGuild.inventoryRow
						? `/app/resource/redirect/guildInventory-${unifiedGuild.inventoryRow}`
						: '/app/guild'
				},
				{
					tableName: 'guildFlyer',
					name: 'Flyer',
					connected: unifiedGuild.flyerRow !== null,
					link: unifiedGuild.flyerRow
						? `/app/resource/redirect/guildFlyer-${unifiedGuild.flyerRow}`
						: '/app/guild',
					unmatchedVariant: 'variant-soft'
				},
				{
					tableName: 'unifiedProduct',
					name: 'Unified Product',
					connected: unifiedGuild.unifiedProductData !== null,
					link: unifiedGuild.unifiedProductData
						? `/app/resource/${unifiedGuild.unifiedProductData.uniref.uniId}/unified`
						: '/app/product'
				}
			],
			other: {
				'SPR Number': unifiedGuild.spr,
				'CIS Number': unifiedGuild.cis,
				'Basics Number': unifiedGuild.basics,
				UPC: unifiedGuild.upc,
				'Unit of Measure': unifiedGuild.um,
				'Quantity per Unit': unifiedGuild.qtyPerUm?.toString() ?? null,
				'Master Pack Quantity': unifiedGuild.masterPackQty?.toString() ?? null,
				Cost: unifiedGuild.costCents ? formatCurrency(unifiedGuild.costCents / 100) : null,
				Vendor: unifiedGuild.vendor,
				Weight: unifiedGuild.weightGrams + ' grams',
				'Freight Flag': unifiedGuild.freightFlag ? 'Yes' : 'No',
				'Heavy Goods Charge (SK)': unifiedGuild.heavyGoodsChargeSkCents
					? formatCurrency(unifiedGuild.heavyGoodsChargeSkCents / 100)
					: null,
				Category: unifiedGuild.category
			}
		};
	}
	if (raw.unifiedSprData) {
		const unifiedSpr = raw.unifiedSprData;

		return {
			idText: 'UnifiedSPR#' + unifiedSpr.id,
			id: unifiedSpr.id,
			name: unifiedSpr.title ?? unifiedSpr.shortTitle ?? 'No Title',
			price:
				unifiedSpr.netPriceCents != null
					? formatCurrency(unifiedSpr.netPriceCents / 100)
					: 'No Price',
			sku: unifiedSpr.sprc,
			stock: null,
			deleted: unifiedSpr.deleted,
			lastUpdated: unifiedSpr.lastUpdated,
			description: unifiedSpr.description ?? undefined,
			imageUrl: unifiedSpr.primaryImage ?? undefined,
			otherImageUrls: unifiedSpr.otherImagesJsonArr
				? JSON.parse(unifiedSpr.otherImagesJsonArr).map(({ url }: { url: string }) => url)
				: undefined,
			connections: [
				{
					tableName: 'sprPriceFile',
					name: 'Price File',
					connected: unifiedSpr.sprPriceFileRow !== null,
					link: unifiedSpr.sprPriceFileRow
						? `/app/resource/redirect/sprPriceFile-${unifiedSpr.sprPriceFileRow}`
						: '/app/spr'
				},
				{
					tableName: 'sprFlatFile',
					name: 'Flat File',
					connected: unifiedSpr.sprFlatFileRow !== null,
					link: unifiedSpr.sprFlatFileRow
						? `/app/resource/redirect/sprFlatFile-${unifiedSpr.sprFlatFileRow}`
						: '/app/spr'
				},
				{
					tableName: 'unifiedProduct',
					name: 'Unified Product',
					connected: unifiedSpr.unifiedProductData !== null,
					link: unifiedSpr.unifiedProductData
						? `/app/resource/${unifiedSpr.unifiedProductData.uniref.uniId}/unified`
						: '/app/product'
				}
			],
			other: {
				Status: unifiedSpr.status ?? null,
				'Unit of Measure': unifiedSpr.um ?? null,
				'Dealer Net Price':
					unifiedSpr.dealerNetPriceCents != null
						? formatCurrency(unifiedSpr.dealerNetPriceCents / 100)
						: null,
				'Net Price':
					unifiedSpr.netPriceCents != null ? formatCurrency(unifiedSpr.netPriceCents / 100) : null,
				'List Price':
					unifiedSpr.listPriceCents != null
						? formatCurrency(unifiedSpr.listPriceCents / 100)
						: null,
				'Etilize ID': unifiedSpr.etilizeId ?? null,
				CWS: unifiedSpr.cws ?? null,
				GTIN: unifiedSpr.gtin ?? null,
				UPC: unifiedSpr.upc ?? null,
				Category: unifiedSpr.category ?? null,
				Keywords: unifiedSpr.keywords ?? null,
				'Brand Name': unifiedSpr.brandName ?? null,
				'Manufacturer Name': unifiedSpr.manufacturerName ?? null,
				'Image Description': unifiedSpr.primaryImageDescription ?? null,
				'Other Images': unifiedSpr.otherImagesJsonArr
			}
		};
	}
	if (raw.unifiedProductData) {
		const unifiedProduct = raw.unifiedProductData;
		return {
			idText: 'UnifiedProduct#' + unifiedProduct.id,
			id: unifiedProduct.id,
			name: unifiedProduct.title ?? 'No Title',
			price: unifiedProduct.onlinePriceCents
				? formatCurrency(unifiedProduct.onlinePriceCents / 100)
				: 'No Price',
			comparePrice: unifiedProduct.onlineComparePriceCents
				? formatCurrency(unifiedProduct.onlineComparePriceCents / 100)
				: null,
			sku: unifiedProduct.gid ?? unifiedProduct.sprc ?? 'Unknown',
			stock:
				unifiedProduct.guildInventory || unifiedProduct.localInventory
					? (unifiedProduct.guildInventory ?? 0) + (unifiedProduct.localInventory ?? 0)
					: null,
			deleted: unifiedProduct.deleted,
			lastUpdated: unifiedProduct.lastUpdated,
			description: unifiedProduct.description ?? undefined,
			imageUrl: unifiedProduct.primaryImage ?? undefined,
			otherImageUrls: unifiedProduct.otherImagesJsonArr
				? JSON.parse(unifiedProduct.otherImagesJsonArr).map(({ url }: { url: string }) => url)
				: undefined,
			connections: [
				{
					tableName: 'unifiedGuild',
					name: 'Unified Guild',
					connected: unifiedProduct.unifiedGuildRow !== null,
					link: unifiedProduct.unifiedGuildRow
						? `/app/resource/redirect/unifiedGuild-${unifiedProduct.unifiedGuildRow}`
						: '/app/guild'
				},
				{
					tableName: 'unifiedSpr',
					name: 'Unified SPR',
					connected: unifiedProduct.unifiedSprRow !== null,
					link: unifiedProduct.unifiedSprRow
						? `/app/resource/redirect/unifiedSpr-${unifiedProduct.unifiedSprRow}`
						: '/app/spr'
				},
				{
					tableName: 'qb',
					name: 'QB',
					connected: unifiedProduct.qbRow !== null,
					link: unifiedProduct.qbRow
						? `/app/resource/redirect/qb-${unifiedProduct.qbRow}`
						: '/app/qb'
				},
				{
					tableName: 'shopify',
					name: 'Shopify',
					connected: unifiedProduct.shopifyRow !== null,
					link: unifiedProduct.shopifyRow
						? `/app/resource/redirect/shopify-${unifiedProduct.shopifyRow}`
						: '/app/shopify'
				}
			],
			other: {
				GID: unifiedProduct.gid,
				SPRC: unifiedProduct.sprc,
				Status: unifiedProduct.status,
				UPC: unifiedProduct.upc,
				'CWS Number': unifiedProduct.cws,
				'Basics Number': unifiedProduct.basics,
				'CIS Number': unifiedProduct.cis,
				'Etilize ID': unifiedProduct.etilizeId,
				Category: unifiedProduct.category,
				'In Flyer': unifiedProduct.inFlyer ? 'Yes' : 'No',
				'QuickBooks Price': unifiedProduct.quickBooksPriceCents
					? formatCurrency(unifiedProduct.quickBooksPriceCents / 100)
					: null,
				'Guild Cost': unifiedProduct.guildCostCents
					? formatCurrency(unifiedProduct.guildCostCents / 100)
					: null,
				'SPR Cost': unifiedProduct.sprCostCents
					? formatCurrency(unifiedProduct.sprCostCents / 100)
					: null,
				'Unit of Measure': unifiedProduct.um,
				'Quantity per Unit': unifiedProduct.qtyPerUm?.toString() ?? null,
				'Available for Sale Online': unifiedProduct.availableForSaleOnline ? 'Yes' : 'No',
				'Guild Inventory': unifiedProduct.guildInventory?.toString() ?? null,
				'Local Inventory': unifiedProduct.localInventory?.toString() ?? null,
				'SPR Inventory Availability': unifiedProduct.sprInventoryAvailability ?? null,
				Weight: unifiedProduct.weightGrams ? unifiedProduct.weightGrams + ' grams' : null,
				Vendor: unifiedProduct.vendor,
				'Primary Image Description': unifiedProduct.primaryImageDescription ?? null
			}
		};
	}
};
