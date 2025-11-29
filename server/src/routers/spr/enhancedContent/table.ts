import { relations } from 'drizzle-orm';
import {
	bigint,
	boolean,
	text,
	pgEnum,
	pgTable,
	serial,
	varchar,
	index
} from 'drizzle-orm/pg-core';
import { sprFlatFile } from '../flatFile/table';

export const imageStatusEnum = pgEnum('spr_image_status', [
	'Published',
	'Series Published',
	'Third Party Published',
	'Third Party Series Published'
]);

export const sprImages = pgTable(
	'sprImages',
	{
		etilizeId: varchar('etilizeId', { length: 32 }).notNull(),
		type: varchar('type', { length: 32 }).notNull(),
		status: imageStatusEnum('status').notNull()
	},
	(sprImages) => [index('sprImages_etilizeId_idx').on(sprImages.etilizeId)]
);

export const sprImagesRelations = relations(sprImages, ({ one }) => ({
	sprEnhancedContent: one(sprEnhancedContent, {
		fields: [sprImages.etilizeId],
		references: [sprEnhancedContent.etilizeId]
	})
}));

export const skuTypeEnum = pgEnum('spr_sku_type', ['CWS', 'UPC', 'GTIN', 'SPRC']);

export const sprSkus = pgTable(
	'sprSkus',
	{
		etilizeId: varchar('etilizeId', { length: 32 }).notNull(),
		type: skuTypeEnum('type').notNull(),
		sku: varchar('sku', { length: 64 }).notNull()
	},
	(sprSkus) => [index('sprSkus_etilizeId_idx').on(sprSkus.etilizeId)]
);

export const sprSkusRelations = relations(sprSkus, ({ one }) => ({
	sprEnhancedContent: one(sprEnhancedContent, {
		fields: [sprSkus.etilizeId],
		references: [sprEnhancedContent.etilizeId]
	})
}));

export const sprEnhancedContent = pgTable(
	'sprEnhancedContent',
	{
		id: serial('id').primaryKey(),
		etilizeId: varchar('etilizeId', { length: 32 }).notNull(),
		sprc: varchar('sprc', { length: 64 }),
		cws: varchar('cws', { length: 64 }),
		upc: varchar('upc', { length: 64 }),
		gtin: varchar('gtin', { length: 64 }),
		primaryImage: varchar('primaryImage', { length: 64 }),
		otherImagesJsonArr: text('otherImagesJsonArr'),
		allSizesJsonArr: text('allSizesJsonArr'),
		deleted: boolean('deleted').default(false).notNull(),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(enhancedContent) => [
		index('sprEnhancedContent_etilizeId_idx').on(enhancedContent.etilizeId),
		index('sprEnhancedContent_last_updated_idx').on(enhancedContent.lastUpdated)
	]
);

export const sprEnhancedContentRelations = relations(sprEnhancedContent, ({ one, many }) => ({
	sprFlatItem: one(sprFlatFile, {
		fields: [sprEnhancedContent.etilizeId],
		references: [sprFlatFile.etilizeId]
	}),
	images: many(sprImages),
	skus: many(sprSkus)
}));
