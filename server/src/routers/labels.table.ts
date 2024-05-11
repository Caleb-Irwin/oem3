import { InferSelectModel, relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  boolean,
  uniqueIndex,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.table";

export const labelSheets = pgTable(
  "labelSheets",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 128 }),
    public: boolean("public"),
    owner: varchar("owner", { length: 256 }).references(() => users.username, {
      onDelete: "cascade",
    }),
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
    sheet: integer("sheet").references(() => labelSheets.id, {
      onDelete: "cascade",
    }),
    barcode: varchar("barcode", { length: 256 }),
    name: varchar("name", { length: 256 }),
    priceCents: integer("price_cents"),
    qbId: varchar("qbId", { length: 256 }),
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

export type Label = InferSelectModel<typeof labels>;
