import { index, integer, pgEnum, pgTable, serial } from 'drizzle-orm/pg-core';
import {
	changesets,
	guildData,
	qb,
	shopify,
	sprFlatFile,
	sprPriceFile,
	unifiedGuild,
	guildInventory,
	guildFlyer
} from '../db.schema';
import { relations } from 'drizzle-orm';

export const resourceTypeEnum = pgEnum('resource_type', [
	'changeset',
	'qb',
	'guildData',
	'guildInventory',
	'guildFlyer',
	'shopify',
	'sprPriceFile',
	'sprFlatFile',
	'unifiedGuild'
]);
export type ResourceType = (typeof resourceTypeEnum.enumValues)[number];

export const uniref = pgTable(
	'uniref',
	{
		uniId: serial('uniId').primaryKey(),
		resourceType: resourceTypeEnum('resource_type').notNull(),
		changeset: integer('changeset')
			.references(() => changesets.id, {
				onDelete: 'cascade'
			})
			.unique(),
		qb: integer('qb')
			.references(() => qb.id, { onDelete: 'cascade' })
			.unique(),
		guildData: integer('guildData')
			.references(() => guildData.id, { onDelete: 'cascade' })
			.unique(),
		guildInventory: integer('guildInventory')
			.references(() => guildInventory.id, {
				onDelete: 'cascade'
			})
			.unique(),
		guildFlyer: integer('guildFlyer')
			.references(() => guildFlyer.id, {
				onDelete: 'cascade'
			})
			.unique(),
		shopify: integer('shopify')
			.references(() => shopify.id, {
				onDelete: 'cascade'
			})
			.unique(),
		sprPriceFile: integer('sprPriceFile')
			.references(() => sprPriceFile.id, {
				onDelete: 'cascade'
			})
			.unique(),
		sprFlatFile: integer('sprFlatFile')
			.references(() => sprFlatFile.id, {
				onDelete: 'cascade'
			})
			.unique(),
		unifiedGuild: integer('unifiedGuild').references(() => unifiedGuild.id, {
			onDelete: 'cascade'
		})
	},
	(uniref) => [
		index('resource_type_idx').on(uniref.uniId),
		index('uniref_changesets_idx').on(uniref.changeset),
		index('uniref_qb_idx').on(uniref.qb),
		index('uniref_guild_idx').on(uniref.guildData),
		index('uniref_guildInventory_idx').on(uniref.guildInventory),
		index('uniref_guildFlyer_idx').on(uniref.guildFlyer),
		index('uniref_shopify_idx').on(uniref.shopify),
		index('spr_price_file_idx').on(uniref.sprPriceFile),
		index('spr_flat_file_idx').on(uniref.sprFlatFile),
		index('uniref_unifiedGuild_idx').on(uniref.unifiedGuild)
	]
);

export const unirefRelations = relations(uniref, ({ one }) => ({
	qbData: one(qb, { fields: [uniref.qb], references: [qb.id] }),
	guildData: one(guildData, {
		fields: [uniref.guildData],
		references: [guildData.id]
	}),
	guildInventoryData: one(guildInventory, {
		fields: [uniref.guildInventory],
		references: [guildInventory.id]
	}),
	guildFlyerData: one(guildFlyer, {
		fields: [uniref.guildFlyer],
		references: [guildFlyer.id]
	}),
	changesetData: one(changesets, {
		fields: [uniref.changeset],
		references: [changesets.id]
	}),
	shopifyData: one(shopify, {
		fields: [uniref.shopify],
		references: [shopify.id]
	}),
	sprPriceFileData: one(sprPriceFile, {
		fields: [uniref.sprPriceFile],
		references: [sprPriceFile.id]
	}),
	sprFlatFileData: one(sprFlatFile, {
		fields: [uniref.sprFlatFile],
		references: [sprFlatFile.id]
	}),
	unifiedGuildData: one(unifiedGuild, {
		fields: [uniref.unifiedGuild],
		references: [unifiedGuild.id]
	})
}));
