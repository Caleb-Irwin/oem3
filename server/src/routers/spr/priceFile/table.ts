import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	varchar,
	bigint,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { unifiedSpr, uniref } from '../../../db.schema';

export const sprPriceStatusEnum = pgEnum('spr_price_status', [
	'Active',
	'Discontinued',
	'Not available'
]);

export const sprPriceUmEnum = pgEnum('spr_price_um', ['EA', 'PAC', 'BOX']);

export const sprPriceFile = pgTable(
	'sprPriceFile',
	{
		id: serial('id').primaryKey(),
		// Null only for legacy SPR price file rows that were never matched to a Novexco code
		novexcoCode: varchar('novexcoCode', { length: 64 }),
		sprcSku: varchar('sprcSku', { length: 256 }),
		guildCode: varchar('guildCode', { length: 256 }),
		cws: varchar('cws', { length: 64 }),
		etilizeId: varchar('etilizeId', { length: 32 }),
		status: sprPriceStatusEnum('status'),
		warehouseStatus: varchar('warehouseStatus', { length: 8 }),
		directStatus: varchar('directStatus', { length: 8 }),
		description: text('description'),
		descriptionFr: text('descriptionFr'),
		categoryDescription: varchar('categoryDescription', { length: 256 }),
		supplierName: varchar('supplierName', { length: 256 }),
		supplierSku: varchar('supplierSku', { length: 256 }),
		um: sprPriceUmEnum('um'),
		unitsPerPack: integer('unitsPerPack'),
		upc: varchar('upc', { length: 32 }),
		catPage: integer('catPage'),
		dealerNetPriceCents: integer('dealerNetPriceCents'),
		directCostCents: integer('directCostCents'),
		netPriceCents: integer('netPriceCents'),
		listPriceCents: integer('listPriceCents'),
		inventory: integer('inventory'),
		deleted: boolean('deleted').default(false).notNull(),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(spr) => [
		uniqueIndex('spr_novexcoCode_idx').on(spr.novexcoCode),
		index('spr_sprcSku_idx').on(spr.sprcSku),
		index('spr_etilizeId_idx').on(spr.etilizeId),
		index('spr_last_updated_idx').on(spr.lastUpdated)
	]
);

export const sprPriceFileRelations = relations(sprPriceFile, ({ one }) => ({
	uniref: one(uniref, {
		fields: [sprPriceFile.id],
		references: [uniref.sprPriceFile]
	}),
	unifiedSprData: one(unifiedSpr, {
		fields: [sprPriceFile.id],
		references: [unifiedSpr.sprPriceFileRow]
	})
}));
