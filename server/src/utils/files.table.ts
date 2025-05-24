import {
  pgTable,
  serial,
  varchar,
  bigint,
  text,
  index,
  pgEnum,
  boolean,
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

export const imageSourceTypeEnum = pgEnum("imageSourceType", ['venxia', 'shopofficeonline']);

export const images = pgTable(
  "images",
  {
    id: serial("id").primaryKey(),
    filePath: text("filePath").notNull(),
    isThumbnail: boolean("isThumbnail").default(false),
    sourceURL: text("sourceURL"),
    sourceHash: text("sourceHash"),
    sourceType: imageSourceTypeEnum("sourceType"),
    productId: varchar("productId", { length: 256 }),
    uploadedTime: bigint("uploadedTime", { mode: "number" }).notNull(),
  },
  (images) => [index("images_sourceURL_idx").on(images.sourceURL), index("images_productId_idx").on(images.productId)]
);