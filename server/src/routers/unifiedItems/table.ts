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
  unique,
} from "drizzle-orm/pg-core";
import {
  guildData,
  guildFlyer,
  guildInventory,
  guildUmEnum,
  qb,
  shopify,
  sprFlatFile,
  sprPriceFile,
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
      .references(() => guildData.id)
      .unique(),
    sprPriceFile: integer("sprPriceFile")
      .references(() => sprPriceFile.id)
      .unique(),
    sprFlatFile: integer("sprFlatFile")
      .references(() => sprFlatFile.id)
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
    qbAlt: integer("qbAlt")
      .references(() => qb.id)
      .unique(),
    shopify: integer("shopify")
      .references(() => shopify.id)
      .unique(),
    shopifyAlt: integer("shopifyAlt")
      .references(() => shopify.id)
      .unique(),
    defaultAltConversionFactor: integer("defaultAltConversionFactor"),
    defaultAltConversionFactorColumnSettings: columnSettings(
      "defaultAltConversionFactorColumnSettings"
    )
      .default("automatic")
      .notNull(),
    defaultUm: guildUmEnum("packageUM"),
    defaultUmColumnSettings: columnSettings("defaultUmColumnSettings")
      .default("automatic")
      .notNull(),
    altUm: guildUmEnum("altUM"),
    altUmColumnSettings: columnSettings("altUmColumnSettings")
      .default("automatic")
      .notNull(),
    barcode: varchar("barcode", { length: 128 }),
    barcodeColumnSettings: columnSettings("barcodeColumnSettings")
      .default("automatic")
      .notNull(),
    sku: varchar("sku", { length: 128 }),
    skuColumnSettings: columnSettings("skuColumnSettings")
      .default("automatic")
      .notNull(),
    priceCents: integer("priceCents"),
    priceColumnSettings: columnSettings("priceCentsColumnSettings"),
    altPriceCents: integer("altPriceCents"),
    altPriceColumnSettings: columnSettings("altPriceCentsColumnSettings"),
    flyerPriceCents: integer("salePriceCents"),
    flyerPriceColumnSettings: columnSettings("flyerPriceCentsColumnSettings")
      .default("automatic")
      .notNull(),
    altFlyerPriceCents: integer("altSalePriceCents"),
    altFlyerPriceColumnSettings: columnSettings(
      "altFlyerPriceCentsColumnSettings"
    )
      .default("automatic")
      .notNull(),
    storePriceCents: integer("storePriceCents"),
    storePriceColumnSettings: columnSettings("storePriceCentsColumnSettings")
      .default("automatic")
      .notNull(),
    storeAltPriceCents: integer("storeAltPriceCents"),
    storeAltPriceColumnSettings: columnSettings(
      "storeAltPriceCentsColumnSettings"
    )
      .default("automatic")
      .notNull(),
    onlinePriceCents: integer("onlinePriceCents"),
    onlinePriceColumnSettings: columnSettings("onlinePriceCentsColumnSettings")
      .default("automatic")
      .notNull(),
    onlineAltPriceCents: integer("onlineAltPriceCents"),
    onlineAltPriceColumnSettings: columnSettings(
      "onlineAltPriceCentsColumnSettings"
    )
      .default("automatic")
      .notNull(),
    storeFlyerPriceCents: integer("storeFlyerPriceCents"),
    storeFlyerPriceColumnSettings: columnSettings(
      "storeFlyerPriceCentsColumnSettings"
    )
      .default("automatic")
      .notNull(),
    storeFlyerAltPriceCents: integer("storeFlyerAltPriceCents"),
    storeFlyerAltPriceColumnSettings: columnSettings(
      "storeFlyerAltPriceCentsColumnSettings"
    )
      .default("automatic")
      .notNull(),
    onlineFlyerPriceCents: integer("onlineFlyerPriceCents"),
    onlineFlyerPriceColumnSettings: columnSettings(
      "onlineFlyerPriceCentsColumnSettings"
    )
      .default("automatic")
      .notNull(),
    onlineFlyerAltPriceCents: integer("onlineFlyerAltPriceCents"),
    onlineFlyerAltPriceColumnSettings: columnSettings(
      "onlineFlyerAltPriceCentsColumnSettings"
    )
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
    storeAltInventory: integer("storeAltInventory"),
    storeAltInventoryColumnSettings: columnSettings(
      "storeAltInventoryColumnSettings"
    )
      .default("automatic")
      .notNull(),
    warehouse0Inventory: integer("warehouse0Inventory"),
    warehouse0InventoryColumnSettings: columnSettings(
      "warehouse0InventoryColumnSettings"
    )
      .default("automatic")
      .notNull(),
    warehouse0AltInventory: integer("warehouse0AltInventory"),
    warehouse0AltInventoryColumnSettings: columnSettings(
      "warehouse0AltInventoryColumnSettings"
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
      shopifyUnique: unique().on(unifiedItems.shopify, unifiedItems.shopifyAlt),
      qbUnique: unique().on(unifiedItems.qb, unifiedItems.qbAlt),
      guildIndex: uniqueIndex("unifiedItems_guild_idx").on(unifiedItems.guild),
      guildInventoryIndex: uniqueIndex("unifiedItems_guildInventory_idx").on(
        unifiedItems.guildInventory
      ),
      guildFlyerIndex: uniqueIndex("unifiedItems_guildFlyer_idx").on(
        unifiedItems.guildFlyer
      ),
      qbIndex: uniqueIndex("unifiedItems_qb_idx").on(unifiedItems.qb),
      qbAltIndex: uniqueIndex("unifiedItems_qbAlt_idx").on(unifiedItems.qbAlt),
      shopifyIndex: uniqueIndex("unifiedItems_shopify_idx").on(
        unifiedItems.shopify
      ),
      shopifyAltUnit: uniqueIndex("unifiedItems_shopifyAlt_idx").on(
        unifiedItems.shopifyAlt
      ),
      barcodeIndex: index("unifiedItems_barcode_idx").on(unifiedItems.barcode),
      lastUpdatedIndex: index("unifiedItems_last_updated_idx").on(
        unifiedItems.lastUpdated
      ),
    };
  }
);

export const unifiedItemsRelations = relations(unifiedItems, ({ one }) => ({
  guildData: one(guildData, {
    fields: [unifiedItems.guild],
    references: [guildData.id],
  }),
  guildInventoryData: one(guildInventory, {
    fields: [unifiedItems.guildInventory],
    references: [guildInventory.id],
  }),
  guildFlyerData: one(guildFlyer, {
    fields: [unifiedItems.guildFlyer],
    references: [guildFlyer.id],
  }),
  sprPriceFileData: one(sprPriceFile, {
    fields: [unifiedItems.sprPriceFile],
    references: [sprPriceFile.id],
  }),
  sprFlatFileData: one(sprFlatFile, {
    fields: [unifiedItems.sprFlatFile],
    references: [sprFlatFile.id],
  }),
  shopifyData: one(shopify, {
    fields: [unifiedItems.shopify],
    references: [shopify.id],
  }),
  shopifyAltData: one(shopify, {
    fields: [unifiedItems.shopifyAlt],
    references: [shopify.id],
  }),
  qbData: one(qb, { fields: [unifiedItems.qb], references: [qb.id] }),
  qbAltData: one(qb, { fields: [unifiedItems.qbAlt], references: [qb.id] }),
}));
