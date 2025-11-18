import { relations } from 'drizzle-orm';
import {
	bigint,
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	uniqueIndex,
	varchar
} from 'drizzle-orm/pg-core';
import {
	cellConfigTable,
	qb,
	shopify,
	shopifyMedia,
	shopifyMetadata,
	sprPriceStatusEnum,
	unifiedGuild,
	unifiedSpr,
	uniref
} from '../../db.schema';

export const productCategoryEnum = pgEnum('productCategory', [
	'office',
	'technologyInk',
	'furniture',
	'cleaningBreakRoom'
]);
export type ProductCategory = (typeof productCategoryEnum.enumValues)[number];

export const productStatusEnum = pgEnum('productStatus', ['ACTIVE', 'DISCONTINUED', 'DISABLED']);
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];

export const productUmEnum = pgEnum('productUm', ['ea', 'pk', 'bx']);
export type ProductUm = (typeof productUmEnum.enumValues)[number];

export const unifiedProduct = pgTable(
	'unifiedProduct',
	{
		id: serial('id').primaryKey(),
		gid: varchar('gid', { length: 256 }),
		sprc: varchar('sprc', { length: 256 }),

		status: productStatusEnum('status'),

		unifiedGuildRow: integer('unifiedGuildRow')
			.unique()
			.references(() => unifiedGuild.id, { onDelete: 'set null' }),
		unifiedSprRow: integer('unifiedSprRow')
			.unique()
			.references(() => unifiedSpr.id, { onDelete: 'set null' }),
		qbRow: integer('qbRow')
			.unique()
			.references(() => qb.id, { onDelete: 'set null' }),
		shopifyRow: integer('shopifyRow')
			.unique()
			.references(() => shopify.id, { onDelete: 'set null' }),

		upc: varchar('upc', { length: 128 }),
		basics: varchar('basics', { length: 128 }),
		cws: varchar('cws', { length: 128 }),
		cis: varchar('cis', { length: 128 }),
		etilizeId: varchar('etilizeId', { length: 32 }),

		title: text('title'),
		description: text('description'),
		category: productCategoryEnum('category'),
		inFlyer: boolean('inFlyer'),

		onlinePriceCents: integer('onlinePriceCents'),
		onlineComparePriceCents: integer('onlineComparePriceCents'),
		quickBooksPriceCents: integer('quickBooksPriceCents'),
		guildCostCents: integer('guildCostCents'),
		sprCostCents: integer('sprCostCents'),

		um: productUmEnum('um'),
		qtyPerUm: integer('qtyPerUm'),

		primaryImage: varchar('primaryImage', { length: 256 }),
		primaryImageDescription: text('primaryImageDescription'),
		otherImagesJsonArr: text('otherImagesJsonArr'),

		availableForSaleOnline: boolean('availableForSaleOnline').default(true).notNull(),
		guildInventory: integer('guildInventory'),
		localInventory: integer('localInventory'),
		sprInventoryAvailability: sprPriceStatusEnum('sprInventoryAvailability'),

		weightGrams: integer('weightGrams'),
		vendor: varchar('vendor', { length: 256 }),

		deleted: boolean('deleted').default(false).notNull(),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(product) => [
		index('product_gid_idx').on(product.gid),
		index('product_sprc_idx').on(product.sprc),
		uniqueIndex('product_unifiedGuildRow_idx').on(product.unifiedGuildRow),
		uniqueIndex('product_unifiedSprRow_idx').on(product.unifiedSprRow),
		uniqueIndex('product_qbRow_idx').on(product.qbRow),
		uniqueIndex('product_shopifyRow_idx').on(product.shopifyRow),
		index('product_upc_idx').on(product.upc),
		index('product_basics_idx').on(product.basics),
		index('product_cws_idx').on(product.cws),
		index('product_cis_idx').on(product.cis),
		index('product_etilizeId_idx').on(product.etilizeId),
		index('product_lastUpdated_idx').on(product.lastUpdated),
		index('product_deleted_idx').on(product.deleted),
		// Additional
		index('product_availableForSaleOnline_idx').on(product.availableForSaleOnline),
		index('product_inFlyer_idx').on(product.inFlyer),
		index('product_status_idx').on(product.status),
		index('product_category_idx').on(product.category)
	]
);

export const unifiedProductRelations = relations(unifiedProduct, ({ one, many }) => ({
	uniref: one(uniref, {
		fields: [unifiedProduct.id],
		references: [uniref.unifiedProduct]
	}),
	// Short relation name to avoid PostgreSQL identifier length issues in nested queries
	u: one(uniref, {
		fields: [unifiedProduct.id],
		references: [uniref.unifiedProduct]
	}),
	unifiedGuildRowContent: one(unifiedGuild, {
		fields: [unifiedProduct.unifiedGuildRow],
		references: [unifiedGuild.id]
	}),
	unifiedSprRowContent: one(unifiedSpr, {
		fields: [unifiedProduct.unifiedSprRow],
		references: [unifiedSpr.id]
	}),
	qbRowContent: one(qb, {
		fields: [unifiedProduct.qbRow],
		references: [qb.id]
	}),
	shopifyRowContent: one(shopify, {
		fields: [unifiedProduct.shopifyRow],
		references: [shopify.id]
	}),
	shopifyMetadata: one(shopifyMetadata, {
		fields: [unifiedProduct.id],
		references: [shopifyMetadata.productId]
	}),
	shopifyMedia: many(shopifyMedia)
}));

export const unifiedProductColumnEnum = pgEnum('unifiedProductColumn', [
	// Identifiers
	'gid',
	'sprc',
	'status',
	// Source refs
	'unifiedGuildRow',
	'unifiedSprRow',
	'qbRow',
	'shopifyRow',
	// Product identifiers
	'upc',
	'basics',
	'cws',
	'cis',
	'etilizeId',
	// Product info
	'title',
	'description',
	'category',
	'inFlyer',
	// Pricing
	'onlinePriceCents',
	'onlineComparePriceCents',
	'quickBooksPriceCents',
	'guildCostCents',
	'sprCostCents',
	// Units
	'um',
	'qtyPerUm',
	// Media
	'primaryImage',
	'primaryImageDescription',
	'otherImagesJsonArr',
	// Inventory and availability
	'availableForSaleOnline',
	'guildInventory',
	'localInventory',
	'sprInventoryAvailability',
	// Physical properties
	'weightGrams',
	'vendor',
	// Operational
	'deleted'
]);

export const { table: unifiedProductCellConfig, relations: unifiedProductCellConfigRelations } =
	cellConfigTable({
		originalTable: unifiedProduct,
		primaryKey: unifiedProduct.id,
		columnEnum: unifiedProductColumnEnum
	});
