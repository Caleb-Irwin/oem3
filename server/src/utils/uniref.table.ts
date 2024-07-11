import { index, integer, pgEnum, pgTable, serial } from "drizzle-orm/pg-core";
import { changesets, qb } from "../db.schema";
import { relations } from "drizzle-orm";

export const resourceTypeEnum = pgEnum("resource_type", ["changeset", "qb"]);
export type ResourceType = (typeof resourceTypeEnum.enumValues)[number];

export const uniref = pgTable(
  "uniref",
  {
    uniId: serial("uniId").primaryKey(),
    resourceType: resourceTypeEnum("resource_type").notNull(),
    changeset: integer("changeset").references(() => changesets.id, {
      onDelete: "cascade",
    }),
    qb: integer("qb").references(() => qb.id, { onDelete: "cascade" }),
  },
  (uniref) => {
    return {
      resourceTypeIndex: index("resource_type_idx").on(uniref.uniId),
      changesetsIndex: index("uniref_changesets_idx").on(uniref.changeset),
      qbIndex: index("uniref_qb_idx").on(uniref.qb),
    };
  }
);

export const unirefRelations = relations(uniref, ({ one }) => ({
  qbData: one(qb, { fields: [uniref.qb], references: [qb.id] }),
  changesetData: one(changesets, {
    fields: [uniref.changeset],
    references: [changesets.id],
  }),
}));
