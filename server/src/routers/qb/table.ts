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
} from "drizzle-orm/pg-core";
import { uniref } from "../../db.schema";

export const qbItemTypeEnum = pgEnum("qb_item_type", [
  "Service",
  "Inventory Part",
  "Inventory Assembly",
  "Non-inventory Part",
  "Other Charge",
  "Subtotal",
  "Group",
  "Discount",
  "Sales Tax Item",
  "Sales Tax Group",
]);
export const taxCodeEnum = pgEnum("tax_code", ["S", "G", "E"]);
export const qbUmEnum = pgEnum("qb_um", ["ea", "pk", "cs"]);

export const qb = pgTable(
  "qb",
  {
    id: serial("id").primaryKey(),
    qbId: varchar("qb_id", { length: 256 }).notNull(),
    desc: text("desc").notNull().default(""),
    type: qbItemTypeEnum("type").notNull(),
    costCents: integer("cost_cents").notNull(),
    priceCents: integer("price_cents").notNull(),
    salesTaxCode: taxCodeEnum("sales_tax_code"),
    purchaseTaxCode: taxCodeEnum("purchase_tax_code"),
    account: varchar("account", { length: 256 }).notNull(),
    quantityOnHand: integer("quantity_on_hand"),
    quantityOnSalesOrder: integer("quantity_on_sales_order"),
    quantityOnPurchaseOrder: integer("quantity_on_purchase_order"),
    um: qbUmEnum("um"),
    preferredVendor: varchar("preferred_vendor", { length: 256 }),
    deleted: boolean("deleted").default(false).notNull(),
    lastUpdated: bigint("lastUpdated", { mode: "number" }).notNull(),
  },
  (qb) => {
    return {
      qbIdIndex: index("qb_qbId_idx").on(qb.qbId),
    };
  }
);

export const qbRelations = relations(qb, ({ one }) => ({
  qbItem: one(uniref, { fields: [qb.id], references: [uniref.qb] }),
}));
