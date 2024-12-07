import {
  bigint,
  boolean,
  integer,
  text,
  pgTable,
  serial,
  varchar,
} from "drizzle-orm/pg-core";
import { guild } from "../table";
import { relations } from "drizzle-orm";

export const guildDescriptions = pgTable("guildDescriptions", {
  id: serial("id").primaryKey(),
  gid: varchar("gid", { length: 256 }).notNull().unique(),
  sanitizedDescription: text("sanitized_description"),
  imageListJSON: text("image_list_json"),
  name: varchar("name", { length: 256 }),
  price: varchar("price", { length: 256 }),
  uom: varchar("uom", { length: 256 }),
  rawResult: text("raw_result"),
  found: boolean("found").default(false).notNull(),
  timesScrapeFailed: integer("times_scrape_failed").default(0).notNull(), // Since last successful scrape
  deleted: boolean("deleted").default(false).notNull(), // If resource 404s, set to true
  lastUpdated: bigint("lastUpdated", { mode: "number" }).notNull(),
});

export const guildDescriptionsRelations = relations(
  guildDescriptions,
  ({ one }) => ({
    guildItem: one(guild, {
      fields: [guildDescriptions.gid],
      references: [guild.gid],
    }),
  })
);
