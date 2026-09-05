import { type InferSelectModel, relations } from 'drizzle-orm';
import {
	pgTable,
	serial,
	varchar,
	boolean,
	uniqueIndex,
	integer,
	index
} from 'drizzle-orm/pg-core';
import { priceChangeExports } from './product/priceChange.exports.table';
import { users } from './users.table';

export const labelSheets = pgTable(
	'labelSheets',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 128 }),
		public: boolean('public'),
		owner: varchar('owner', { length: 256 }).references(() => users.username, {
			onDelete: 'cascade'
		}),
		/** Set when the sheet was generated from a price change export, which is what lets the
		 * sheet offer the QuickBooks change and revert CSVs for those same items. */
		priceChangeExport: integer('price_change_export').references(() => priceChangeExports.id, {
			onDelete: 'set null'
		})
	},
	(labelSheet) => [uniqueIndex('labelSheet_id_idx').on(labelSheet.id)]
);

export const labelSheetsRelations = relations(labelSheets, ({ many }) => ({
	labels: many(labels)
}));

export const labels = pgTable(
	'labels',
	{
		id: serial('id').primaryKey(),
		sheet: integer('sheet').references(() => labelSheets.id, {
			onDelete: 'cascade'
		}),
		barcode: varchar('barcode', { length: 256 }),
		name: varchar('name', { length: 256 }),
		priceCents: integer('price_cents'),
		qbId: varchar('qbId', { length: 256 })
	},
	(labels) => [index('labels_id_idx').on(labels.id), index('labels_sheet_idx').on(labels.sheet)]
);

export const labelsRelations = relations(labelSheets, ({ one }) => ({
	sheet: one(labelSheets)
}));

export type Label = InferSelectModel<typeof labels>;
