import { index, varchar, text, pgTable } from 'drizzle-orm/pg-core';

export const kv = pgTable(
	'kv',
	{
		id: varchar('id', { length: 256 }).unique().primaryKey(),
		namespace: varchar('namespace', { length: 128 }),
		key: varchar('key', { length: 128 }),
		value: text('value')
	},
	(kv) => [index('kv_id_idx').on(kv.key)]
);
