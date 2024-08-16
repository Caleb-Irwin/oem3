import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  bigint,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import {
  guild,
  guildFlyer,
  guildInventory,
  qb,
  shopify,
} from "../../db.schema";
import { relations } from "drizzle-orm";

export const unifiedItemTypeEnum = pgEnum("unified_item_type", [
  "custom",
  "guild",
]);
export const columnSettings = pgEnum("column_settings", [
  "automatic",
  "automaticSmallChanges",
  "approval",
  "manual",
]);

export const unifiedItems = pgTable(
  "unifiedItems",
  {
    id: serial("id").primaryKey(),
    type: unifiedItemTypeEnum("type").notNull(),
    guild: integer("guild")
      .references(() => guild.id)
      .unique(),
    guildInventory: integer("guildInventory")
      .references(() => guildInventory.id)
      .unique(),
    guildFlyer: integer("guildFlyer")
      .references(() => guildFlyer.id)
      .unique(),
    qb: integer("qb")
      .references(() => qb.id)
      .unique(),
    shopify: integer("shopify")
      .references(() => shopify.id)
      .unique(),
    barcode: varchar("barcode", { length: 128 }),
    barcodeColumnSettings: columnSettings("barcodeColumnSettings")
      .default("automatic")
      .notNull(),
    sku: varchar("sku", { length: 128 }),
    skuColumnSettings: columnSettings("skuColumnSettings")
      .default("automatic")
      .notNull(),
    storePriceCents: integer("storePriceCents"),
    storePriceColumnSettings: columnSettings("storePriceColumnSettings")
      .default("automatic")
      .notNull(),
    onlinePriceCents: integer("onlinePriceCents"),
    onlinePriceColumnSettings: columnSettings("onlinePriceColumnSettings")
      .default("automatic")
      .notNull(),
    flyerPriceCents: integer("salePriceCents"),
    flyerPriceColumnSettings: columnSettings("flyerPriceColumnSettings")
      .default("automatic")
      .notNull(),
    title: text("title"),
    titleColumnSettings: columnSettings("titleColumnSettings")
      .default("automatic")
      .notNull(),
    description: text("description"),
    descriptionColumnSettings: columnSettings("descriptionColumnSettings")
      .default("automatic")
      .notNull(),
    imageUrl: text("imageUrl"),
    imageUrlColumnSettings: columnSettings("imageUrlColumnSettings")
      .default("automatic")
      .notNull(),
    storeInventory: integer("storeInventory"),
    storeInventoryColumnSettings: columnSettings("storeInventoryColumnSettings")
      .default("automatic")
      .notNull(),
    warehouse0Inventory: integer("onlineInventory"),
    warehouse0InventoryColumnSettings: columnSettings(
      "warehouse0InventoryColumnSettings"
    )
      .default("automatic")
      .notNull(),
    allowBackorder: boolean("allowBackorder"),
    allowBackorderColumnSettings: columnSettings("allowBackorderColumnSettings")
      .default("automatic")
      .notNull(),
    costCents: integer("costCents"),
    costCentsColumnSettings: columnSettings("costCentsColumnSettings")
      .default("automatic")
      .notNull(),
    deleted: boolean("deleted").default(false).notNull(),
    lastUpdated: bigint("lastUpdated", { mode: "number" }).notNull(),
  },
  (unifiedItems) => {
    return {
      guildIndex: uniqueIndex("unifiedItems_guild_idx").on(unifiedItems.guild),
      guildInventoryIndex: uniqueIndex("unifiedItems_guildInventory_idx").on(
        unifiedItems.guildInventory
      ),
      guildFlyerIndex: uniqueIndex("unifiedItems_guildFlyer_idx").on(
        unifiedItems.guildFlyer
      ),
      qbIndex: uniqueIndex("unifiedItems_qb_idx").on(unifiedItems.qb),
      shopifyIndex: uniqueIndex("unifiedItems_shopify_idx").on(
        unifiedItems.shopify
      ),
      barcodeIndex: index("unifiedItems_barcode_idx").on(unifiedItems.barcode),
    };
  }
);

export const unifiedItemsRelations = relations(unifiedItems, ({ one }) => ({
  guildData: one(guild, {
    fields: [unifiedItems.guild],
    references: [guild.id],
  }),
  guildInventoryData: one(guildInventory, {
    fields: [unifiedItems.guildInventory],
    references: [guildInventory.id],
  }),
  guildFlyerData: one(guildFlyer, {
    fields: [unifiedItems.guildFlyer],
    references: [guildFlyer.id],
  }),
  shopifyData: one(shopify, {
    fields: [unifiedItems.shopify],
    references: [shopify.id],
  }),
  qbData: one(qb, { fields: [unifiedItems.qb], references: [qb.id] }),
}));
