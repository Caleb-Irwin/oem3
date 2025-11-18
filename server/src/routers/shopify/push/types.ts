import type { shopifyMedia } from './media.table';
import type {
	ProductStatus as ProductStatusType,
	ProductVariantInventoryPolicy as ProductVariantInventoryPolicyType,
	WeightUnit as WeightUnitType
} from '../../../../types/admin.types';
import type { shopify, unifiedProduct } from '../../../db.schema';
import { db } from '../../../db';

// Define Enums locally as values, cast to the remote types for compatibility
export const ProductStatus = {
	Active: 'ACTIVE' as ProductStatusType,
	Archived: 'ARCHIVED' as ProductStatusType,
	Draft: 'DRAFT' as ProductStatusType,
	Unlisted: 'UNLISTED' as ProductStatusType
} as const;

export const ProductVariantInventoryPolicy = {
	Continue: 'CONTINUE' as ProductVariantInventoryPolicyType,
	Deny: 'DENY' as ProductVariantInventoryPolicyType
} as const;

export const WeightUnit = {
	Grams: 'GRAMS' as WeightUnitType,
	Kilograms: 'KILOGRAMS' as WeightUnitType,
	Ounces: 'OUNCES' as WeightUnitType,
	Pounds: 'POUNDS' as WeightUnitType
} as const;

export type ShopifyProductTypes =
	| 'Printing/Technology'
	| 'Office/School'
	| 'Furniture'
	| 'Cleaning/Breakroom';

export type ImageMap = Map<
	string,
	{ filePath: string; uploadedTime: number; sourceHash: string | null; sourceURL: string | null }
>;

export type ShopifyMedia = typeof shopifyMedia.$inferSelect;

export type Product = typeof unifiedProduct.$inferSelect;
export type Shopify = typeof shopify.$inferSelect;

async function productQueryResFunc() {
	return await db.query.unifiedProduct.findMany({
		with: {
			shopifyMetadata: true,
			shopifyRowContent: true,
			uniref: true,
			shopifyMedia: true
		}
	});
}

export type ProductQueryRes = Awaited<ReturnType<typeof productQueryResFunc>>[number];
