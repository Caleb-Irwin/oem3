import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";
import { changesets } from "./changeset.table";
import { uniref } from "./uniref.table";

export const entryType = pgEnum("history_entry_type", [
  "create",
  "delete",
  "update",
]);
export type EntryType = (typeof entryType.enumValues)[number];

export const history = pgTable(
  "history",
  {
    id: serial("id").primaryKey(),
    entryType: entryType("entry_type").notNull(),
    changeset: integer("set").references(() => changesets.id, {
      onDelete: "set null",
    }),
    uniref: integer("uniref")
      .references(() => uniref.uniId)
      .notNull(),
    data: text("data"),
    created: bigint("created", { mode: "number" }).notNull(),
  },
  (history) => {
    return {
      changeset: index("history_changes_set_idx").on(history.changeset),
      uniref: index("history_uniref_idx").on(history.uniref),
      created: index("history_created_idx").on(history.created),
      entryType: index("history_entry_type_idx").on(history.entryType),
    };
  }
);
