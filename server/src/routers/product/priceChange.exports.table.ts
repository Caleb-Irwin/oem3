import { bigint, index, integer, pgEnum, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

/** The slice of the queue a reviewer is working through. */
export const priceChangeCategoryEnum = pgEnum('price_change_category', [
	'flyer',
	'guild',
	'spr',
	'all'
]);

/**
 * One batch of approved price changes sent to QuickBooks.
 *
 * This lives apart from the rest of the price change tables so that `labelSheets` can point at
 * it without dragging the unified product schema into its imports.
 */
export const priceChangeExports = pgTable(
	'price_change_exports',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 256 }).notNull(),
		category: priceChangeCategoryEnum('category').notNull(),
		itemCount: integer('item_count').notNull().default(0),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		createdBy: varchar('created_by', { length: 256 }).notNull()
	},
	(exportRow) => [index('price_change_exports_created_at_idx').on(exportRow.createdAt)]
);

export type PriceChangeCategory = (typeof priceChangeCategoryEnum.enumValues)[number];
