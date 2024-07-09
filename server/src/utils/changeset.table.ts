import {
  pgTable,
  serial,
  bigint,
  text,
  index,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { files } from "./files.table";
import { uniref } from "./uniref.table";
import { relations } from "drizzle-orm";

export const changesetType = pgEnum("changeset_type", ["qb"]),
  changesetStatusType = pgEnum("changeset_status_type", [
    "generating",
    "current",
    "completed",
    "cancelled",
    "partiallyCancelled",
    "error",
  ]);

export const changesets = pgTable("changesets", {
  id: serial("id").primaryKey(),
  type: changesetType("type").notNull(),
  status: changesetStatusType("status").notNull(),
  file: integer("file").references(() => files.id, {
    onDelete: "set null",
  }),
  created: bigint("uploadedTime", { mode: "number" }).notNull(),
});

export const changesetRelations = relations(changesets, ({ many }) => ({
  changes: many(changes),
}));

export const changeType = pgEnum("change_type", [
  "nop",
  "create",
  "delete",
  "update",
  "inventoryUpdate",
]);

export const changes = pgTable(
  "changes",
  {
    id: serial("id").primaryKey(),
    set: integer("set")
      .references(() => changesets.id, {
        onDelete: "cascade",
      })
      .notNull(),
    uniref: integer("uniref").references(() => uniref.uniId),
    type: changeType("type").notNull(),
    data: text("data"),
    created: bigint("created", { mode: "number" }).notNull(),
  },
  (changes) => {
    return {
      changeset: index("changes_set_idx").on(changes.set),
      uniref: index("changes_uniref_idx").on(changes.uniref),
    };
  }
);
