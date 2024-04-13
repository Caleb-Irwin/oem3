import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uniqueIndex,
  varchar,
  text,
  index,
  serial,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const permissionLevelEnum = pgEnum("permissionLevel", [
  "admin",
  "general",
  "viewer",
  "public",
]);

export const permissionLevelEnumZod = z.enum(permissionLevelEnum.enumValues);
export type PermissionLevel = z.infer<typeof permissionLevelEnumZod>;

export const users = pgTable(
  "users",
  {
    username: varchar("username", { length: 256 }).unique().primaryKey(),
    passwordHash: varchar("password_hash", { length: 256 }),
    permissionLevel: permissionLevelEnum("permissionLevel"),
  },
  (users) => {
    return {
      usernameIndex: uniqueIndex("username_idx").on(users.username),
    };
  }
);

export const kv = pgTable(
  "kv",
  {
    id: varchar("id", { length: 256 }).unique().primaryKey(),
    namespace: varchar("namespace", { length: 128 }),
    key: varchar("key", { length: 128 }),
    value: text("value"),
  },
  (kv) => {
    return {
      idIndex: index("kv_id_idx").on(kv.key),
    };
  }
);

export const labelSheets = pgTable(
  "labelSheets",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 128 }),
    public: boolean("public"),
    owner: varchar("owner", { length: 256 }).references(() => users.username),
  },
  (labelSheet) => {
    return {
      idIndex: uniqueIndex("labelSheet_id_idx").on(labelSheet.id),
    };
  }
);

export const labelSheetsRelations = relations(labelSheets, ({ many }) => ({
  labels: many(labels),
}));

export const labels = pgTable(
  "labels",
  {
    id: serial("id").primaryKey(),
    sheet: integer("sheet").references(() => labelSheets.id),
    barcode: varchar("barcode", { length: 256 }),
    name: varchar("name", { length: 256 }),
    priceCents: integer("price_cents"),
  },
  (labels) => {
    return {
      idIndex: index("labels_id_idx").on(labels.id),
      sheetIndex: index("labels_sheet_idx").on(labels.sheet),
    };
  }
);

export const labelsRelations = relations(labelSheets, ({ one }) => ({
  sheet: one(labelSheets),
}));
