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
import { guildData, guildUmEnum } from './data/table';
import { guildInventory } from './inventory/table';
import { guildFlyer } from './flyer/table';
import { relations } from 'drizzle-orm';
import { uniref, cellConfigTable, unifiedProduct } from '../../db.schema';

export const categoryEnum = pgEnum('category', [
	'officeSchool',
	'technology',
	'furniture',
	'cleaningBreakRoom',
	'inkToner'
]);

export const unifiedGuild = pgTable(
	'unifiedGuild',
	{
		id: serial('id').primaryKey(),
		gid: varchar('gid', { length: 256 }).notNull().unique(),

		dataRow: integer('dataRow')
			.notNull()
			.unique()
			.references(() => guildData.id, { onDelete: 'cascade' }),
		inventoryRow: integer('inventoryRow')
			.unique()
			.references(() => guildInventory.id, {
				onDelete: 'set null'
			}),
		flyerRow: integer('flyerRow')
			.unique()
			.references(() => guildFlyer.id, {
				onDelete: 'set null'
			}),

		upc: varchar('upc', { length: 256 }),
		spr: varchar('spr', { length: 256 }),
		basics: varchar('basics', { length: 256 }),
		cis: varchar('cis', { length: 256 }),

		title: varchar('title', { length: 256 }),
		description: text('description'),
		priceCents: integer('priceCents'),
		comparePriceCents: integer('comparePriceCents'),
		inFlyer: boolean('inFlyer').default(false),
		costCents: integer('costCents'),
		um: guildUmEnum('um'),
		qtyPerUm: integer('qtyPerUm'),
		masterPackQty: integer('masterPackQty'),
		imageUrl: varchar('imageUrl', { length: 256 }),
		imageDescription: text('imageDescription'),
		otherImageListJSON: text('otherImageListJSON'), // {url: string, description: string}[]
		vendor: varchar('vendor', { length: 256 }),
		category: categoryEnum('category'),

		weightGrams: integer('weightGrams'),
		heavyGoodsChargeSkCents: integer('heavyGoodsChargeSkCents'),
		freightFlag: boolean('freightFlag').default(false),

		inventory: integer('inventory'),

		deleted: boolean('deleted').default(false).notNull(),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(unifiedGuildTable) => [
		uniqueIndex('dataRow_idx').on(unifiedGuildTable.dataRow),
		uniqueIndex('inventoryRow_idx').on(unifiedGuildTable.inventoryRow),
		uniqueIndex('flyerRow_idx').on(unifiedGuildTable.flyerRow),
		index('upc_idx').on(unifiedGuildTable.upc),
		index('spr_idx').on(unifiedGuildTable.spr),
		index('cis_idx').on(unifiedGuildTable.cis),
		index('lastUpdated_idx').on(unifiedGuildTable.lastUpdated)
	]
);

export const unifiedGuildRelations = relations(unifiedGuild, ({ one }) => ({
	uniref: one(uniref, {
		fields: [unifiedGuild.id],
		references: [uniref.unifiedGuild]
	}),
	dataRowContent: one(guildData, {
		fields: [unifiedGuild.dataRow],
		references: [guildData.id]
	}),
	inventoryRowContent: one(guildInventory, {
		fields: [unifiedGuild.inventoryRow],
		references: [guildInventory.id]
	}),
	flyerRowContent: one(guildFlyer, {
		fields: [unifiedGuild.flyerRow],
		references: [guildFlyer.id]
	}),
	unifiedProductData: one(unifiedProduct, {
		fields: [unifiedGuild.id],
		references: [unifiedProduct.unifiedGuildRow]
	}),
	// Short relation name to avoid PostgreSQL identifier length issues in nested queries
	upd: one(unifiedProduct, {
		fields: [unifiedGuild.id],
		references: [unifiedProduct.unifiedGuildRow]
	})
}));

export const unifiedGuildColumnEnum = pgEnum('unifiedGuildColumn', [
	'gid',
	'dataRow',
	'inventoryRow',
	'flyerRow',
	'upc',
	'spr',
	'basics',
	'cis',
	'title',
	'description',
	'priceCents',
	'comparePriceCents',
	'inFlyer',
	'costCents',
	'um',
	'qtyPerUm',
	'masterPackQty',
	'imageUrl',
	'imageDescription',
	'otherImageListJSON',
	'vendor',
	'category',
	'weightGrams',
	'heavyGoodsChargeSkCents',
	'freightFlag',
	'inventory',
	'deleted'
]);

export const { table: unifiedGuildCellConfig, relations: unifiedGuildCellConfigRelations } =
	cellConfigTable({
		originalTable: unifiedGuild,
		primaryKey: unifiedGuild.id,
		columnEnum: unifiedGuildColumnEnum
	});
