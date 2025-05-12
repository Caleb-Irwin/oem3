import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  varchar,
} from "drizzle-orm/pg-core";
import { uniref } from "../../../db.schema";
import { relations } from "drizzle-orm";

export const guildFlyer = pgTable(
  "guildFlyer",
  {
    id: serial("id").primaryKey(),
    gid: varchar("gid", { length: 256 }).notNull().unique(),
    flyerNumber: integer("flyer_number"),
    startDate: bigint("start_date", { mode: "number" }),
    endDate: bigint("end_date", { mode: "number" }),
    vendorCode: varchar("vendor_code", { length: 256 }),
    flyerCostCents: integer("flyer_cost_cents"),
    flyerPriceL0Cents: integer("flyer_price_l0_cents"),
    flyerPriceL1Cents: integer("flyer_price_l1_cents"),
    flyerPriceRetailCents: integer("flyer_price_retail_cents"),
    regularPriceL0Cents: integer("regular_price_l0_cents"),
    regularPriceL1Cents: integer("regular_price_l1_cents"),
    deleted: boolean("deleted").default(false).notNull(),
    lastUpdated: bigint("lastUpdated", { mode: "number" }).notNull(),
  },
  (guildFlyer) => [
    index("guild_flyer_gid_idx").on(guildFlyer.gid),
    index("guild_flyer_last_updated_idx").on(guildFlyer.lastUpdated),
  ]
);

export const guildFlyerRelations = relations(guildFlyer, ({ one }) => ({
  uniref: one(uniref, {
    fields: [guildFlyer.id],
    references: [uniref.guildFlyer],
  }),
}));
