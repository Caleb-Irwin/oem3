import { pgEnum, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { UnifiedTableNamesArray } from '../../db.schema';

export const summaryTypeEnum = pgEnum('summary_type', ['all', ...UnifiedTableNamesArray]);
export type SummaryTypeEnum = (typeof summaryTypeEnum.enumValues)[number];

export const summaries = pgTable('summaries', {
	id: serial('id').primaryKey(),
	type: summaryTypeEnum('type').unique().notNull(),
	data: text('data').notNull()
});
