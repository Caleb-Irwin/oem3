import {
  pgTable,
  serial,
  varchar,
  bigint,
  text,
  index,
} from "drizzle-orm/pg-core";
import { users } from "../routers/users.table";

export const files = pgTable(
  "files",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }),
    type: varchar("type", { length: 256 }),
    author: varchar("author", { length: 256 }).references(
      () => users.username,
      {
        onDelete: "no action",
      }
    ),
    content: text("content"),
    uploadedTime: bigint("uploadedTime", { mode: "number" }),
  },
  (files) => [index("files_id_idx").on(files.id)]
);
