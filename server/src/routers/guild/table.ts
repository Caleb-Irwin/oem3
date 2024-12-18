import {
  bigint,
  boolean,
  index,
  integer,
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

export const unifiedGuildTable = pgTable(
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
    otherImageListJSON: text("imageListJSON"),
    vendor: varchar("vendor", { length: 256 }),

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
      upcIndex: uniqueIndex("upc_idx").on(unifiedGuildTable.upc),
      sprIndex: uniqueIndex("spr_idx").on(unifiedGuildTable.spr),
      cisIndex: uniqueIndex("cis_idx").on(unifiedGuildTable.cis),
      lastUpdatedIndex: index("lastUpdated_idx").on(
        unifiedGuildTable.lastUpdated
      ),
    };
  }
);

export const unifiedGuildRelations = relations(
  unifiedGuildTable,
  ({ one }) => ({
    dataRow: one(guildData, {
      fields: [unifiedGuildTable.dataRow],
      references: [guildData.id],
    }),
    inventoryRow: one(guildInventory, {
      fields: [unifiedGuildTable.inventoryRow],
      references: [guildInventory.id],
    }),
    flyerRow: one(guildFlyer, {
      fields: [unifiedGuildTable.flyerRow],
      references: [guildFlyer.id],
    }),
  })
);
