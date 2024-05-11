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
    descLock: boolean("desc_lock").default(false).notNull(),
    type: qbItemTypeEnum("type").notNull(),
    costCents: integer("cost_cents").notNull(),
    costCentsLock: boolean("cost_cents_lock").default(false).notNull(),
    priceCents: integer("price_cents").notNull(),
    priceCentsLock: boolean("price_cents_lock").default(false).notNull(),
    salesTaxCode: taxCodeEnum("sales_tax_code"),
    purchaseTaxCode: taxCodeEnum("purchase_tax_code"),
    account: varchar("account", { length: 256 }).notNull(),
    accountLock: boolean("account_lock").default(false).notNull(),
    quantityOnHand: integer("quantity_on_hand"),
    quantityOnHandLock: boolean("quantity_on_hand_lock")
      .default(false)
      .notNull(),
    quantityOnSalesOrder: integer("quantity_on_sales_order"),
    quantityOnPurchaseOrder: integer("quantity_on_purchase_order"),
    um: qbUmEnum("um"),
    preferredVendor: varchar("preferred_vendor", { length: 256 }),
    deleted: boolean("deleted").default(false).notNull(),
    lastUpdated: integer("lastUpdated").notNull(),
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
