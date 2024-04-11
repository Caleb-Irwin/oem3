import {
  pgTable,
  pgEnum,
  uniqueIndex,
  varchar,
  text,
  index,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const permissionLevelEnum = pgEnum("permissionLevel", [
  "admin",
  "general",
  "viewer",
  "public",
]);

export const permissionLevelEnumZod = z.enum(permissionLevelEnum.enumValues);
export type PermissionLevel = z.infer<typeof permissionLevelEnumZod>;

export const users = pgTable(
  "users",
  {
    username: varchar("username", { length: 256 }).unique().primaryKey(),
    passwordHash: varchar("password_hash", { length: 256 }),
    permissionLevel: permissionLevelEnum("permissionLevel"),
  },
  (users) => {
    return {
      usernameIndex: uniqueIndex("username_idx").on(users.username),
    };
  }
);

export const kv = pgTable(
  "kv",
  {
    id: varchar("id", { length: 256 }).unique().primaryKey(),
    namespace: varchar("namespace", { length: 128 }),
    key: varchar("key", { length: 128 }),
    value: text("value"),
  },
  (kv) => {
    return {
      idIndex: index("kv_id_idx").on(kv.key),
    };
  }
);
