import { integer, pgEnum, pgTable, serial, uniqueIndex } from 'drizzle-orm/pg-core';
import {
	changesets,
	guildData,
	qb,
	shopify,
	sprFlatFile,
	sprPriceFile,
	unifiedGuild,
	guildInventory,
	guildFlyer,
	unifiedSpr,
	unifiedProduct
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
	'unifiedGuild',
	'unifiedSpr',
	'unifiedProduct'
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
		unifiedGuild: integer('unifiedGuild')
			.references(() => unifiedGuild.id, {
				onDelete: 'cascade'
			})
			.unique(),
		unifiedSpr: integer('unifiedSpr')
			.references(() => unifiedSpr.id, {
				onDelete: 'cascade'
			})
			.unique(),
		unifiedProduct: integer('unifiedProduct')
			.references(() => unifiedProduct.id, {
				onDelete: 'cascade'
			})
			.unique()
	},
	(uniref) => [
		uniqueIndex('resource_type_idx').on(uniref.uniId),
		uniqueIndex('uniref_changesets_idx').on(uniref.changeset),
		uniqueIndex('uniref_qb_idx').on(uniref.qb),
		uniqueIndex('uniref_guild_idx').on(uniref.guildData),
		uniqueIndex('uniref_guildInventory_idx').on(uniref.guildInventory),
		uniqueIndex('uniref_guildFlyer_idx').on(uniref.guildFlyer),
		uniqueIndex('uniref_shopify_idx').on(uniref.shopify),
		uniqueIndex('uniref_spr_price_file_idx').on(uniref.sprPriceFile),
		uniqueIndex('uniref_spr_flat_file_idx').on(uniref.sprFlatFile),
		uniqueIndex('uniref_unifiedGuild_idx').on(uniref.unifiedGuild),
		uniqueIndex('uniref_unifiedSpr_idx').on(uniref.unifiedSpr),
		uniqueIndex('uniref_unifiedProduct_idx').on(uniref.unifiedProduct)
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
	}),
	unifiedSprData: one(unifiedSpr, {
		fields: [uniref.unifiedSpr],
		references: [unifiedSpr.id]
	}),
	unifiedProductData: one(unifiedProduct, {
		fields: [uniref.unifiedProduct],
		references: [unifiedProduct.id]
	})
}));
