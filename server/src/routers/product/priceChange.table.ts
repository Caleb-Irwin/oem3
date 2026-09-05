import { relations, sql } from 'drizzle-orm';
import {
	bigint,
	boolean,
	check,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	uniqueIndex,
	varchar
} from 'drizzle-orm/pg-core';
import { priceChangeExports } from './priceChange.exports.table';
import { unifiedProduct } from './table';

/**
 * Which price a change applies to. Only QuickBooks prices are reviewed today — online prices
 * are pushed to Shopify without approval — but the queue is keyed by channel so an `online`
 * channel can be added without touching any of the review, export or revert plumbing.
 */
export const priceChangeChannelEnum = pgEnum('price_change_channel', ['quickBooks']);

/**
 * `exported` means this target was written to a QuickBooks CSV. The row survives until an import
 * reports that target. If the target changes first, the worker requeues the new change while the
 * immutable item in `price_change_export_items` keeps the earlier export available in history.
 */
export const priceChangeStatusEnum = pgEnum('price_change_status', [
	'pending',
	'approved',
	'rejected',
	'exported'
]);

/** Where the online price this target is derived from came from. */
export const priceChangeSourceEnum = pgEnum('price_change_source', ['guild', 'spr', 'other']);

/**
 * A frozen copy of what went out in one export. Everything the QuickBooks CSV needs lives here
 * rather than being re-derived at download time: once the change is imported, `qb.priceCents`
 * holds the new price, so the price to revert *to* only exists in this snapshot.
 */
export const priceChangeExportItems = pgTable(
	'price_change_export_items',
	{
		id: serial('id').primaryKey(),
		exportRow: integer('export_row')
			.notNull()
			.references(() => priceChangeExports.id, { onDelete: 'cascade' }),
		productRow: integer('product_row').references(() => unifiedProduct.id, {
			onDelete: 'set null'
		}),
		qbId: varchar('qb_id', { length: 256 }).notNull(),
		qbAccount: varchar('qb_account', { length: 256 }),
		productName: varchar('product_name', { length: 256 }),
		barcode: varchar('barcode', { length: 256 }),
		title: text('title'),
		preferredVendor: varchar('preferred_vendor', { length: 256 }),
		previousPriceCents: integer('previous_price_cents').notNull(),
		newPriceCents: integer('new_price_cents').notNull()
	},
	(item) => [
		index('price_change_export_items_export_row_idx').on(item.exportRow),
		index('price_change_export_items_product_row_idx').on(item.productRow),
		check(
			'price_change_export_items_previous_price_nonnegative',
			sql`${item.previousPriceCents} >= 0`
		),
		check('price_change_export_items_new_price_nonnegative', sql`${item.newPriceCents} >= 0`)
	]
);

export const priceChanges = pgTable(
	'price_changes',
	{
		id: serial('id').primaryKey(),
		productRow: integer('product_row')
			.notNull()
			.references(() => unifiedProduct.id, { onDelete: 'cascade' }),
		channel: priceChangeChannelEnum('channel').notNull().default('quickBooks'),
		status: priceChangeStatusEnum('status').notNull().default('pending'),
		/** The price the channel currently holds, i.e. what the change moves away from. */
		currentPriceCents: integer('current_price_cents').notNull(),
		targetPriceCents: integer('target_price_cents').notNull(),
		/**
		 * Percent change to three decimals. A low current price can put this above a 32-bit integer,
		 * while integer-cent source prices keep it inside JavaScript's safe integer range.
		 */
		changePercentMilli: bigint('change_percent_milli', { mode: 'number' }).notNull(),
		inFlyer: boolean('in_flyer').notNull().default(false),
		source: priceChangeSourceEnum('source').notNull().default('other'),
		/** The target as it stood when approved; if the target moves the change is re-queued. */
		approvedPriceCents: integer('approved_price_cents'),
		/** The target that was turned down. Kept out of the queue until the target moves off it. */
		rejectedPriceCents: integer('rejected_price_cents'),
		decidedAt: bigint('decided_at', { mode: 'number' }),
		decidedBy: varchar('decided_by', { length: 256 }),
		exportRow: integer('export_row').references(() => priceChangeExports.id, {
			onDelete: 'set null'
		}),
		exportedAt: bigint('exported_at', { mode: 'number' }),
		computedAt: bigint('computed_at', { mode: 'number' }).notNull()
	},
	(change) => [
		uniqueIndex('price_changes_product_channel_idx').on(change.productRow, change.channel),
		index('price_changes_status_idx').on(change.status),
		index('price_changes_change_percent_idx').on(change.changePercentMilli),
		index('price_changes_export_row_idx').on(change.exportRow),
		check('price_changes_current_price_nonnegative', sql`${change.currentPriceCents} >= 0`),
		check('price_changes_target_price_nonnegative', sql`${change.targetPriceCents} >= 0`),
		check(
			'price_changes_approved_price_nonnegative',
			sql`${change.approvedPriceCents} is null or ${change.approvedPriceCents} >= 0`
		),
		check(
			'price_changes_rejected_price_nonnegative',
			sql`${change.rejectedPriceCents} is null or ${change.rejectedPriceCents} >= 0`
		)
	]
);

export const priceChangesRelations = relations(priceChanges, ({ one }) => ({
	product: one(unifiedProduct, {
		fields: [priceChanges.productRow],
		references: [unifiedProduct.id]
	}),
	exportedIn: one(priceChangeExports, {
		fields: [priceChanges.exportRow],
		references: [priceChangeExports.id]
	})
}));

export const priceChangeExportsRelations = relations(priceChangeExports, ({ many }) => ({
	items: many(priceChangeExportItems)
}));

export const priceChangeExportItemsRelations = relations(priceChangeExportItems, ({ one }) => ({
	exportedIn: one(priceChangeExports, {
		fields: [priceChangeExportItems.exportRow],
		references: [priceChangeExports.id]
	}),
	product: one(unifiedProduct, {
		fields: [priceChangeExportItems.productRow],
		references: [unifiedProduct.id]
	})
}));

export type PriceChangeStatus = (typeof priceChangeStatusEnum.enumValues)[number];
