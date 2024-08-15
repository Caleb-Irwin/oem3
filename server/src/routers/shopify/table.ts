import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  bigint,
  pgEnum,
} from "drizzle-orm/pg-core";
import { uniref } from "../../db.schema";

export const statusEnum = pgEnum("shopifyStatus", [
  "ACTIVE",
  "ARCHIVED",
  "DRAFT",
]);

export const shopify = pgTable("shopify", {
  id: serial("id").primaryKey(),
  productId: varchar("productId", { length: 128 }).notNull(),
  handle: varchar("handle", { length: 255 }).notNull(),
  title: text("title").notNull(),
  htmlDescription: text("htmlDescription"),
  imageId: varchar("imageId", { length: 128 }),
  imageAltText: text("imageAltText"),
  imageUrl: varchar("imageUrl", { length: 255 }),
  totalInventory: integer("totalInventory"),
  tagsJsonArr: text("tagsJsonArr"),
  hasOnlyDefaultVariant: boolean("hasOnlyDefaultVariant").notNull(),
  publishedAt: bigint("publishedAt", { mode: "number" }),
  updatedAt: bigint("updatedAt", { mode: "number" }),
  status: statusEnum("status").notNull(),
  variantId: varchar("variantId", { length: 128 }).notNull(),
  vPriceCents: integer("vPriceCents").notNull(),
  vComparePriceCents: integer("vComparePriceCents"),
  vWeightGrams: integer("vWeightGrams"),
  vSku: varchar("vSku", { length: 128 }),
  vBarcode: varchar("vBarcode", { length: 128 }),
  vInventoryPolicyContinue: boolean("vInventoryPolicyContinue"),
  vRequiresShipping: boolean("vRequiresShipping"),
  vUnitCostCents: integer("vUnitCostCents"),
  vInventoryAvailableStore: integer("vInventoryAvailableStore"),
  vInventoryOnHandStore: integer("vInventoryOnHandStore"),
  vInventoryCommittedStore: integer("vInventoryCommittedStore"),
  vInventoryOnHandWarehouse0: integer("vInventoryOnHandWarehouse0"),
  deleted: boolean("deleted").default(false).notNull(),
  lastUpdated: bigint("lastUpdated", { mode: "number" }).notNull(),
});

export const shopifyRelations = relations(shopify, ({ one }) => ({
  uniref: one(uniref, {
    fields: [shopify.id],
    references: [uniref.shopify],
  }),
}));
