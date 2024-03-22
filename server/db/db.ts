import {
  pgTable,
  pgEnum,
  serial,
  uniqueIndex,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

export const permissionLevelEnum = pgEnum("permissionLevel", [
  "admin",
  "general",
  "viewer",
  "public",
]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 256 }).unique(),
    passwordHash: varchar("password_hash", { length: 256 }),
    permissionLevel: permissionLevelEnum("permissionLevel"),
  },
  (users) => {
    return {
      usernameIndex: uniqueIndex("username_idx").on(users.username),
    };
  }
);
