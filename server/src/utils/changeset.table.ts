import {
  pgTable,
  serial,
  bigint,
  text,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { files } from "./files.table";

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
  summary: text("summary"),
  created: bigint("uploadedTime", { mode: "number" }).notNull(),
});

export const changeType = pgEnum("change_type", [
  "nop",
  "create",
  "delete",
  "update",
  "inventoryUpdate",
]);
