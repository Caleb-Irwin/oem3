import { bigint, boolean, integer, pgTable, serial, uniqueIndex } from 'drizzle-orm/pg-core';
import { uniref } from '../utils/uniref.table';
import { relations } from 'drizzle-orm';

export const unmatchedErrors = pgTable(
	'unmatchedErrors',
	{
		id: serial('id').primaryKey(),
		uniId: integer('uniId')
			.references(() => uniref.uniId, { onDelete: 'cascade' })
			.notNull()
			.unique(),
		allowUnmatched: boolean('allow_unmatched').notNull().default(false),
		created: bigint('created', { mode: 'number' }).notNull()
	},
	(t) => [uniqueIndex('unmatched_errors_uniId_idx').on(t.uniId)]
);

export const unmatchedErrorsRelations = relations(unmatchedErrors, ({ one }) => ({
	uniref: one(uniref, { fields: [unmatchedErrors.uniId], references: [uniref.uniId] })
}));
