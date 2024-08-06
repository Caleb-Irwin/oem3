import {
  bigint,
  boolean,
  integer,
  pgTable,
  serial,
  varchar,
} from "drizzle-orm/pg-core";
import { uniref } from "../../../db.schema";
import { guildUmEnum } from "../table";
import { relations } from "drizzle-orm";

export const guildInventory = pgTable("guildInventory", {
  id: serial("id").primaryKey(),
  gid: varchar("gid", { length: 256 }).notNull(),
  onHand: integer("on_hand"),
  sku: varchar("sku", { length: 256 }),
  upc: varchar("upc", { length: 256 }),
  spr: varchar("spr", { length: 256 }),
  basics: varchar("basics", { length: 256 }),
  cis: varchar("cis", { length: 256 }),
  qtyPerUm: integer("qty_per_um"),
  um: guildUmEnum("um"),
  deleted: boolean("deleted").default(false).notNull(),
  lastUpdated: bigint("lastUpdated", { mode: "number" }).notNull(),
});

export const guildInventoryRelations = relations(guildInventory, ({ one }) => ({
  uniref: one(uniref, {
    fields: [guildInventory.id],
    references: [uniref.guildInventory],
  }),
}));
