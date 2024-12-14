import { index, integer, pgEnum, pgTable, serial } from "drizzle-orm/pg-core";
import {
  changesets,
  guild,
  qb,
  shopify,
  sprFlatFile,
  sprPriceFile,
  unifiedItems,
} from "../db.schema";
import { relations } from "drizzle-orm";
import { guildInventory } from "../routers/guild/inventory/table";
import { guildFlyer } from "../routers/guild/flyer/table";

export const resourceTypeEnum = pgEnum("resource_type", [
  "changeset",
  "qb",
  "guild",
  "guildInventory",
  "guildFlyer",
  "shopify",
  "unifiedItem",
  "sprPriceFile",
  "sprFlatFile",
]);
export type ResourceType = (typeof resourceTypeEnum.enumValues)[number];

export const uniref = pgTable(
  "uniref",
  {
    uniId: serial("uniId").primaryKey(),
    resourceType: resourceTypeEnum("resource_type").notNull(),
    changeset: integer("changeset")
      .references(() => changesets.id, {
        onDelete: "cascade",
      })
      .unique(),
    qb: integer("qb")
      .references(() => qb.id, { onDelete: "cascade" })
      .unique(),
    guild: integer("guild")
      .references(() => guild.id, { onDelete: "cascade" })
      .unique(),
    guildInventory: integer("guildInventory")
      .references(() => guildInventory.id, {
        onDelete: "cascade",
      })
      .unique(),
    guildFlyer: integer("guildFlyer")
      .references(() => guildFlyer.id, {
        onDelete: "cascade",
      })
      .unique(),
    shopify: integer("shopify")
      .references(() => shopify.id, {
        onDelete: "cascade",
      })
      .unique(),
    sprPriceFile: integer("sprPriceFile")
      .references(() => sprPriceFile.id, {
        onDelete: "cascade",
      })
      .unique(),
    sprFlatFile: integer("sprFlatFile")
      .references(() => sprFlatFile.id, {
        onDelete: "cascade",
      })
      .unique(),
    unifiedItem: integer("unifiedItem")
      .references(() => unifiedItems.id, {
        onDelete: "cascade",
      })
      .unique(),
  },
  (uniref) => {
    return {
      resourceTypeIndex: index("resource_type_idx").on(uniref.uniId),
      changesetsIndex: index("uniref_changesets_idx").on(uniref.changeset),
      qbIndex: index("uniref_qb_idx").on(uniref.qb),
      guildIndex: index("uniref_guild_idx").on(uniref.guild),
      guildInventoryIndex: index("uniref_guildInventory_idx").on(
        uniref.guildInventory
      ),
      guildFlyerIndex: index("uniref_guildFlyer_idx").on(uniref.guildFlyer),
      shopifyIndex: index("uniref_shopify_idx").on(uniref.shopify),
      sprPriceFileIndex: index("spr_price_file_idx").on(uniref.sprPriceFile),
      sprFlatFileIndex: index("spr_flat_file_idx").on(uniref.sprFlatFile),
      unifiedItemIndex: index("uniref_unifiedItem_idx").on(uniref.unifiedItem),
    };
  }
);

export const unirefRelations = relations(uniref, ({ one }) => ({
  qbData: one(qb, { fields: [uniref.qb], references: [qb.id] }),
  guildData: one(guild, { fields: [uniref.guild], references: [guild.id] }),
  guildInventoryData: one(guildInventory, {
    fields: [uniref.guildInventory],
    references: [guildInventory.id],
  }),
  guildFlyerData: one(guildFlyer, {
    fields: [uniref.guildFlyer],
    references: [guildFlyer.id],
  }),
  changesetData: one(changesets, {
    fields: [uniref.changeset],
    references: [changesets.id],
  }),
  shopifyData: one(shopify, {
    fields: [uniref.shopify],
    references: [shopify.id],
  }),
  unifiedItemData: one(unifiedItems, {
    fields: [uniref.unifiedItem],
    references: [unifiedItems.id],
  }),
  sprPriceFileData: one(sprPriceFile, {
    fields: [uniref.sprPriceFile],
    references: [sprPriceFile.id],
  }),
  sprFlatFileData: one(sprFlatFile, {
    fields: [uniref.sprFlatFile],
    references: [sprFlatFile.id],
  }),
}));
