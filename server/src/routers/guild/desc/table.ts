import {
  bigint,
  boolean,
  integer,
  text,
  pgTable,
  serial,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { guildData } from "../data/table";
import { relations } from "drizzle-orm";

export const guildDescriptions = pgTable(
  "guildDescriptions",
  {
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
  },
  (guildDescriptions) => {
    return {
      gidIndex: index("guild_descriptions_gid_idx").on(guildDescriptions.gid),
      lastUpdatedIndex: index("guild_descriptions_last_updated_idx").on(
        guildDescriptions.lastUpdated
      ),
    };
  }
);

export const guildDescriptionsRelations = relations(
  guildDescriptions,
  ({ one }) => ({
    guildItem: one(guildData, {
      fields: [guildDescriptions.gid],
      references: [guildData.gid],
    }),
  })
);
