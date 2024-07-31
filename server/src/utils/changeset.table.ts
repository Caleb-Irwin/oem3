import {
  pgTable,
  serial,
  bigint,
  text,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { files } from "./files.table";
import type { guild, qb } from "../db.schema";

export const changesetType = pgEnum("changeset_type", ["qb", "guild"]),
  changesetStatusType = pgEnum("changeset_status_type", [
    "generating",
    "completed",
  ]);
export type ChangesetType = (typeof changesetType.enumValues)[number];
export type ChangesetTable = typeof qb | typeof guild;

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
