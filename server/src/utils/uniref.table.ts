import { index, integer, pgEnum, pgTable, serial } from "drizzle-orm/pg-core";
import { qb } from "../db.schema";
import { relations } from "drizzle-orm";

export const resourceTypeEnum = pgEnum("resource_type", ["qb"]);

export const uniref = pgTable(
  "uniref",
  {
    uniId: serial("uniId").primaryKey(),
    resourceType: resourceTypeEnum("resource_type"),
    qb: integer("qb").references(() => qb.id, { onDelete: "cascade" }),
  },
  (uniref) => {
    return {
      resourceTypeIndex: index("resource_type_idx").on(uniref.uniId),
      qbIndex: index("uniref_qb_idx").on(uniref.qb),
    };
  }
);

export const unirefRelations = relations(uniref, ({ one }) => ({
  qbItem: one(qb, { fields: [uniref.qb], references: [qb.id] }),
}));
