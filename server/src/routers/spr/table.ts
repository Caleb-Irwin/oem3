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
import { cellConfigTable, uniref } from '../../db.schema';
import { sprFlatFile } from './flatFile/table';
import { sprPriceFile, sprPriceStatusEnum, sprPriceUmEnum } from './priceFile/table';

export const sprCategoryEnum = pgEnum('sprCategory', [
	'office',
	'technologyInk',
	'furniture',
	'cleaningBreakRoom'
]);

// Unified SPR table
export const unifiedSpr = pgTable(
	'unifiedSpr',
	{
		id: serial('id').primaryKey(),
		sprc: varchar('sprc', { length: 256 }).notNull().unique(),

		sprPriceFileRow: integer('sprPriceFileRow')
			.notNull()
			.unique()
			.references(() => sprPriceFile.id, { onDelete: 'cascade' }),
		sprFlatFileRow: integer('sprFlatFileRow')
			.unique()
			.references(() => sprFlatFile.id, { onDelete: 'set null' }),

		etilizeId: varchar('etilizeId', { length: 32 }),
		cws: varchar('cws', { length: 64 }),
		gtin: varchar('gtin', { length: 64 }),
		upc: varchar('upc', { length: 32 }),

		shortTitle: text('shortTitle'),
		title: text('title'),
		description: text('description'),
		category: sprCategoryEnum('category'),

		dealerNetPriceCents: integer('dealerNetPriceCents'),
		netPriceCents: integer('netPriceCents'),
		listPriceCents: integer('listPriceCents'),
		status: sprPriceStatusEnum('status'),
		um: sprPriceUmEnum('um'),

		primaryImage: varchar('primaryImage', { length: 256 }),
		otherImagesJsonArr: text('otherImagesJsonArr'),
		allSizesJsonArr: text('allSizesJsonArr'),

		keywords: text('keywords'),
		brandName: varchar('brandName', { length: 256 }),
		manufacturerName: varchar('manufacturerName', { length: 256 }),

		deleted: boolean('deleted').default(false).notNull(),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(unified) => [
		uniqueIndex('unifiedSpr_spr_price_row_idx').on(unified.sprPriceFileRow),
		uniqueIndex('unifiedSpr_spr_flat_row_idx').on(unified.sprFlatFileRow),
		index('unifiedSpr_spr_sprc_idx').on(unified.sprc),
		index('unifiedSpr_spr_etilizeId_idx').on(unified.etilizeId),
		index('unifiedSpr_spr_upc_idx').on(unified.upc),
		index('unifiedSpr_spr_lastUpdated_idx').on(unified.lastUpdated)
	]
);

export const unifiedSprRelations = relations(unifiedSpr, ({ one }) => ({
	uniref: one(uniref, {
		fields: [unifiedSpr.id],
		references: [uniref.unifiedSpr]
	}),
	sprPriceFileRowContent: one(sprPriceFile, {
		fields: [unifiedSpr.sprPriceFileRow],
		references: [sprPriceFile.id]
	}),
	sprFlatFileRowContent: one(sprFlatFile, {
		fields: [unifiedSpr.sprFlatFileRow],
		references: [sprFlatFile.id]
	})
}));

export const unifiedSprColumnEnum = pgEnum('unifiedSprColumn', [
	// Source refs
	'sprc',
	'sprPriceFileRow',
	'sprFlatFileRow',
	// Identifiers
	'etilizeId',
	'cws',
	'gtin',
	'upc',
	// Titles and descriptions
	'shortTitle',
	'title',
	'description',
	'category',
	// Pricing (from PriceFile)
	'dealerNetPriceCents',
	'netPriceCents',
	'listPriceCents',
	'status',
	'um',
	// Media (from Enhanced/Flat)
	'primaryImage',
	'otherImagesJsonArr',
	'allSizesJsonArr',
	// Attribution
	'keywords',
	'brandName',
	'manufacturerName',
	// Operational
	'deleted'
]);

export const { table: unifiedSprCellConfig, relations: unifiedSprCellConfigRelations } =
	cellConfigTable({
		originalTable: unifiedSpr,
		primaryKey: unifiedSpr.id,
		columnEnum: unifiedSprColumnEnum
	});
