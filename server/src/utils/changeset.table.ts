import {
  pgTable,
  serial,
  varchar,
  bigint,
  text,
  index,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { files } from "./files.table";
import { uniref } from "./uniref.table";

const changesetType = pgEnum("changeset_type", ["qb"]);

export const changesets = pgTable("changesets", {
  id: serial("id").primaryKey(),
  type: changesetType("type").notNull(),
  file: varchar("file", { length: 256 }).references(() => files.id, {
    onDelete: "set null",
  }),
  created: bigint("uploadedTime", { mode: "number" }).notNull(),
});

export const changes = pgTable(
  "changes",
  {
    id: serial("id").primaryKey(),
    set: integer("set")
      .references(() => changesets.id, {
        onDelete: "cascade",
      })
      .notNull(),
    uniId: integer("uniref").references(() => uniref.uniId),
  },
  (changes) => {
    return {
      changeset: index("changes_set_idx").on(changes.set),
    };
  }
);
