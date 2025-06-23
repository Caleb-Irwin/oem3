import { index, integer, pgEnum, pgTable, serial } from 'drizzle-orm/pg-core';
import {
	changesets,
	guildData,
	qb,
	shopify,
	sprFlatFile,
	sprPriceFile,
	unifiedGuild
} from '../db.schema';
import { relations } from 'drizzle-orm';
import { guildInventory } from '../routers/guild/inventory/table';
import { guildFlyer } from '../routers/guild/flyer/table';

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
	(uniref) => {
		return {
			resourceTypeIndex: index('resource_type_idx').on(uniref.uniId),
			changesetsIndex: index('uniref_changesets_idx').on(uniref.changeset),
			qbIndex: index('uniref_qb_idx').on(uniref.qb),
			guildIndex: index('uniref_guild_idx').on(uniref.guildData),
			guildInventoryIndex: index('uniref_guildInventory_idx').on(uniref.guildInventory),
			guildFlyerIndex: index('uniref_guildFlyer_idx').on(uniref.guildFlyer),
			shopifyIndex: index('uniref_shopify_idx').on(uniref.shopify),
			sprPriceFileIndex: index('spr_price_file_idx').on(uniref.sprPriceFile),
			sprFlatFileIndex: index('spr_flat_file_idx').on(uniref.sprFlatFile),
			unifiedGuildIndex: index('uniref_unifiedGuild_idx').on(uniref.unifiedGuild)
		};
	}
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
