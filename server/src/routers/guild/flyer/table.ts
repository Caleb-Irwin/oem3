import {
	bigint,
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	uniqueIndex,
	varchar
} from 'drizzle-orm/pg-core';
import { files, unifiedGuild, uniref } from '../../../db.schema';
import { relations } from 'drizzle-orm';

export const guildFlyerOverrideEnum = pgEnum('guild_flyer_override', [
	'auto',
	'active',
	'inactive'
]);

/**
 * A single flyer (one flyer number / date range). Several flyers can run at the
 * same time; `guildFlyer` holds the resolved item rows for whichever flyers are
 * currently active.
 */
export const guildFlyerSet = pgTable(
	'guildFlyerSet',
	{
		id: serial('id').primaryKey(),
		// `flyer_number` when the file provides one, otherwise derived from the dates
		key: varchar('key', { length: 256 }).notNull().unique(),
		flyerNumber: integer('flyer_number'),
		startDate: bigint('start_date', { mode: 'number' }),
		endDate: bigint('end_date', { mode: 'number' }),
		sourceFile: integer('source_file').references(() => files.id, { onDelete: 'set null' }),
		override: guildFlyerOverrideEnum('override').default('auto').notNull(),
		// The activation state that was last applied to `guildFlyer`
		active: boolean('active').default(false).notNull(),
		itemCount: integer('item_count').default(0).notNull(),
		deleted: boolean('deleted').default(false).notNull(),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(guildFlyerSet) => [
		index('guild_flyer_set_key_idx').on(guildFlyerSet.key),
		index('guild_flyer_set_dates_idx').on(guildFlyerSet.startDate, guildFlyerSet.endDate)
	]
);

/** Every item of every imported flyer, including items of flyers that are not active. */
export const guildFlyerItem = pgTable(
	'guildFlyerItem',
	{
		id: serial('id').primaryKey(),
		set: integer('set')
			.notNull()
			.references(() => guildFlyerSet.id, { onDelete: 'cascade' }),
		gid: varchar('gid', { length: 256 }).notNull(),
		vendorCode: varchar('vendor_code', { length: 256 }),
		flyerCostCents: integer('flyer_cost_cents'),
		flyerPriceL0Cents: integer('flyer_price_l0_cents'),
		flyerPriceL1Cents: integer('flyer_price_l1_cents'),
		flyerPriceRetailCents: integer('flyer_price_retail_cents'),
		regularPriceL0Cents: integer('regular_price_l0_cents'),
		regularPriceL1Cents: integer('regular_price_l1_cents')
	},
	(guildFlyerItem) => [
		uniqueIndex('guild_flyer_item_set_gid_idx').on(guildFlyerItem.set, guildFlyerItem.gid),
		index('guild_flyer_item_gid_idx').on(guildFlyerItem.gid)
	]
);

/**
 * The resolved flyer row for each item: one row per gid, holding the winning
 * offer across every active flyer. Everything downstream (guild unifier,
 * product unifier, search, resources) reads this table, so it keeps one row per
 * gid exactly as it did when only one flyer could be active.
 */
export const guildFlyer = pgTable(
	'guildFlyer',
	{
		id: serial('id').primaryKey(),
		gid: varchar('gid', { length: 256 }).notNull().unique(),
		set: integer('set').references(() => guildFlyerSet.id, { onDelete: 'set null' }),
		flyerNumber: integer('flyer_number'),
		startDate: bigint('start_date', { mode: 'number' }),
		endDate: bigint('end_date', { mode: 'number' }),
		vendorCode: varchar('vendor_code', { length: 256 }),
		flyerCostCents: integer('flyer_cost_cents'),
		flyerPriceL0Cents: integer('flyer_price_l0_cents'),
		flyerPriceL1Cents: integer('flyer_price_l1_cents'),
		flyerPriceRetailCents: integer('flyer_price_retail_cents'),
		regularPriceL0Cents: integer('regular_price_l0_cents'),
		regularPriceL1Cents: integer('regular_price_l1_cents'),
		deleted: boolean('deleted').default(false).notNull(),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(guildFlyer) => [
		index('guild_flyer_gid_idx').on(guildFlyer.gid),
		index('guild_flyer_last_updated_idx').on(guildFlyer.lastUpdated)
	]
);

export const guildFlyerRelations = relations(guildFlyer, ({ one }) => ({
	uniref: one(uniref, {
		fields: [guildFlyer.id],
		references: [uniref.guildFlyer]
	}),
	unifiedGuildData: one(unifiedGuild, {
		fields: [guildFlyer.id],
		references: [unifiedGuild.flyerRow]
	}),
	setContent: one(guildFlyerSet, {
		fields: [guildFlyer.set],
		references: [guildFlyerSet.id]
	})
}));

export const guildFlyerSetRelations = relations(guildFlyerSet, ({ many, one }) => ({
	items: many(guildFlyerItem),
	sourceFileContent: one(files, {
		fields: [guildFlyerSet.sourceFile],
		references: [files.id]
	})
}));

export const guildFlyerItemRelations = relations(guildFlyerItem, ({ one }) => ({
	setContent: one(guildFlyerSet, {
		fields: [guildFlyerItem.set],
		references: [guildFlyerSet.id]
	})
}));
