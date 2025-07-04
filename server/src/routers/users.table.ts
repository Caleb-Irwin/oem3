import { pgTable, pgEnum, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { z } from 'zod';

export const permissionLevelEnum = pgEnum('permissionLevel', [
	'admin',
	'general',
	'viewer',
	'public'
]);

export const permissionLevelEnumZod = z.enum(permissionLevelEnum.enumValues);
export type PermissionLevel = z.infer<typeof permissionLevelEnumZod>;

export const users = pgTable(
	'users',
	{
		username: varchar('username', { length: 256 }).unique().primaryKey(),
		passwordHash: varchar('password_hash', { length: 256 }),
		permissionLevel: permissionLevelEnum('permissionLevel')
	},
	(users) => [uniqueIndex('username_idx').on(users.username)]
);
