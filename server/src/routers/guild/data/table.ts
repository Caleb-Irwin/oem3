import {
	bigint,
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	varchar
} from 'drizzle-orm/pg-core';
import { guildDescriptions, unifiedGuild, uniref } from '../../../db.schema';
import { relations, sql } from 'drizzle-orm';

export const guildUmEnum = pgEnum('guild_um', [
	'bx',
	'bg',
	'ct',
	'cs',
	'cd',
	'ea',
	'ev',
	'kt',
	'st',
	'sl',
	'tb',
	'pr',
	'pk'
]);

export const guildData = pgTable(
	'guildData',
	{
		id: serial('id').primaryKey(),
		gid: varchar('gid', { length: 256 }).notNull().unique(),
		upc: varchar('upc', { length: 256 }),
		spr: varchar('spr', { length: 256 }),
		basics: varchar('basics', { length: 256 }),
		cis: varchar('cis', { length: 256 }),
		priceL0Cents: integer('price_l0_cents').notNull(),
		priceL1Cents: integer('price_l1_cents').notNull(),
		priceRetailCents: integer('price_retail_cents').notNull(),
		memberPriceCents: integer('member_price_cents').notNull(),
		dropshipPriceCents: integer('dropship_price_cents').notNull(),
		shortDesc: text('short_desc').notNull().default(''),
		longDesc: text('long_desc').notNull().default(''),
		imageURL: varchar('image_url', { length: 256 }),
		vendor: varchar('vendor', { length: 256 }),
		webCategory: integer('web_category').notNull().default(-1),
		webCategory1Desc: text('web_category_1_desc').notNull().default(''),
		webCategory2Desc: text('web_category_2_desc').notNull().default(''),
		webCategory3Desc: text('web_category_3_desc').notNull().default(''),
		webCategory4Desc: text('web_category_4_desc').notNull().default(''),
		um: guildUmEnum('um'),
		standardPackQty: integer('standard_pack_qty').notNull().default(-1),
		masterPackQty: integer('master_pack_qty').notNull().default(-1),
		freightFlag: boolean('freight_flag').notNull().default(false),
		weightGrams: integer('weight_grams').notNull().default(-1),
		heavyGoodsChargeSkCents: integer('heavy_goods_charge_sk_cents').notNull().default(0),
		minOrderQty: integer('min_order_qty').notNull().default(-1),
		guildDateChanged: bigint('guild_date_changed', { mode: 'number' }),
		deleted: boolean('deleted').default(false).notNull(),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(guildData) => [
		index('guild_upc_idx').on(guildData.upc),
		index('guild_shortUpc_idx').using(
			'btree',
			sql`(NULLIF("substring"((guild.upc)::text, (length((guild.upc)::text) - 10), 10), ''::text))`
		),
		index('guild_data_last_updated_idx').on(guildData.lastUpdated)
	]
);

export const guildRelations = relations(guildData, ({ one }) => ({
	uniref: one(uniref, {
		fields: [guildData.id],
		references: [uniref.guildData]
	}),
	desc: one(guildDescriptions, {
		fields: [guildData.gid],
		references: [guildDescriptions.gid]
	}),
	unifiedGuild: one(unifiedGuild, {
		fields: [guildData.id],
		references: [unifiedGuild.dataRow]
	})
}));
