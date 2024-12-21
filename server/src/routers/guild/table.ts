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
  varchar,
} from "drizzle-orm/pg-core";
import { guildData, guildUmEnum } from "./data/table";
import { guildInventory } from "./inventory/table";
import { guildFlyer } from "./flyer/table";
import { relations } from "drizzle-orm";
import { uniref } from "../../db.schema";

export const categoryEnum = pgEnum("category", [
  "officeSchool",
  "technology",
  "furniture",
  "cleaningBreakRoom",
  "inkToner",
]);

export const unifiedGuild = pgTable(
  "unifiedGuild",
  {
    id: serial("id").primaryKey(),
    gid: varchar("gid", { length: 256 }).notNull().unique(),

    dataRow: integer("data")
      .notNull()
      .references(() => guildData.id, { onDelete: "cascade" }),
    inventoryRow: integer("inventory").references(() => guildInventory.id, {
      onDelete: "set null",
    }),
    flyerRow: integer("flyer").references(() => guildFlyer.id, {
      onDelete: "set null",
    }),

    upc: varchar("upc", { length: 256 }),
    spr: varchar("spr", { length: 256 }),
    basics: varchar("basics", { length: 256 }),
    cis: varchar("cis", { length: 256 }),

    title: varchar("title", { length: 256 }),
    description: text("description"),
    priceCents: integer("priceCents"),
    comparePriceCents: integer("comparePriceCents"),
    costCents: integer("costCents"),
    um: guildUmEnum("um"),
    qtyPerUm: integer("qtyPerUm"),
    masterPackQty: integer("masterPackQty"),
    imageUrl: varchar("imageUrl", { length: 256 }),
    imageDescriptions: text("imageDescriptions"),
    otherImageListJSON: text("imageListJSON"), // {url: string, description: string}[]
    vendor: varchar("vendor", { length: 256 }),
    category: categoryEnum("category"),

    weightGrams: integer("weightGrams"),
    heavyGoodsChargeSkCents: integer("heavyGoodsChargeSkCents"),
    freightFlag: boolean("freightFlag").default(false),

    deleted: boolean("deleted").default(false).notNull(),
    lastUpdated: bigint("lastUpdated", { mode: "number" }).notNull(),
  },
  (unifiedGuildTable) => {
    return {
      dataRowIndex: uniqueIndex("dataRow_idx").on(unifiedGuildTable.dataRow),
      inventoryRowIndex: uniqueIndex("inventoryRow_idx").on(
        unifiedGuildTable.inventoryRow
      ),
      flyerRowIndex: uniqueIndex("flyerRow_idx").on(unifiedGuildTable.flyerRow),
      upcIndex: index("upc_idx").on(unifiedGuildTable.upc),
      sprIndex: index("spr_idx").on(unifiedGuildTable.spr),
      cisIndex: index("cis_idx").on(unifiedGuildTable.cis),
      lastUpdatedIndex: index("lastUpdated_idx").on(
        unifiedGuildTable.lastUpdated
      ),
    };
  }
);

export const unifiedGuildRelations = relations(unifiedGuild, ({ one }) => ({
  uniref: one(uniref, {
    fields: [unifiedGuild.id],
    references: [uniref.unifiedGuild],
  }),
  dataRowContent: one(guildData, {
    fields: [unifiedGuild.dataRow],
    references: [guildData.id],
  }),
  inventoryRowContent: one(guildInventory, {
    fields: [unifiedGuild.inventoryRow],
    references: [guildInventory.id],
  }),
  flyerRowContent: one(guildFlyer, {
    fields: [unifiedGuild.flyerRow],
    references: [guildFlyer.id],
  }),
}));
