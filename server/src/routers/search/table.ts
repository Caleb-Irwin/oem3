import { relations, sql } from "drizzle-orm";
import { index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { resourceTypeEnum, uniref } from "../../db.schema";

export const search = pgTable(
  "search",
  {
    id: serial("id").primaryKey(),
    uniId: integer("uniref")
      .references(() => uniref.uniId, {
        onDelete: "cascade",
      })
      .unique()
      .notNull(),
    type: resourceTypeEnum("type").notNull(),
    keyInfo: text("keyInfo").notNull(),
    otherInfo: text("otherInfo").notNull(),
  },
  (search) => [
    index("search_index").using(
      "gin",
      sql`(
          setweight(to_tsvector('english', ${search.keyInfo}), 'A') ||
          setweight(to_tsvector('english', ${search.otherInfo}), 'B')
      )`
    ),
  ]
);

export const searchRelations = relations(search, ({ one }) => ({
  uniref: one(uniref, { fields: [search.uniId], references: [uniref.uniId] }),
}));
