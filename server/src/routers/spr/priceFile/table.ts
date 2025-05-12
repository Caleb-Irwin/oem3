import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  varchar,
  bigint,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { uniref } from "../../../db.schema";

export const sprPriceStatusEnum = pgEnum("spr_price_status", [
  "Active",
  "Discontinued",
  "Not available",
]);

export const sprPriceUmEnum = pgEnum("spr_price_um", ["EA", "PAC", "BOX"]);

export const sprPriceFile = pgTable(
  "sprPriceFile",
  {
    id: serial("id").primaryKey(),
    sprcSku: varchar("sprcSku", { length: 256 }).notNull().unique(),
    etilizeId: varchar("etilizeId", { length: 32 }),
    status: sprPriceStatusEnum("status"),
    description: text("description"),
    um: sprPriceUmEnum("um"),
    upc: varchar("upc", { length: 32 }),
    catPage: integer("catPage"),
    dealerNetPriceCents: integer("dealerNetPriceCents").notNull(),
    netPriceCents: integer("netPriceCents").notNull(),
    listPriceCents: integer("listPriceCents").notNull(),
    deleted: boolean("deleted").default(false).notNull(),
    lastUpdated: bigint("lastUpdated", { mode: "number" }).notNull(),
  },
  (spr) => [
    uniqueIndex("spr_sprcSku_idx").on(spr.sprcSku),
    index("spr_etilizeId_idx").on(spr.etilizeId),
    index("spr_last_updated_idx").on(spr.lastUpdated),
  ]
);

export const sprPriceFileRelations = relations(sprPriceFile, ({ one }) => ({
  uniref: one(uniref, {
    fields: [sprPriceFile.id],
    references: [uniref.sprPriceFile],
  }),
}));
