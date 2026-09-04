import { relations } from 'drizzle-orm';
import { bigint, index, integer, pgEnum, pgTable, serial, uniqueIndex } from 'drizzle-orm/pg-core';
import { qb } from '../qb/table';

export const smartOrderStatusEnum = pgEnum('smart_order_status', [
	'insufficient',
	'now',
	'soon',
	'later'
]);
export const smartOrderForecasts = pgTable(
	'smart_order_forecasts',
	{
		id: serial('id').primaryKey(),
		qbRow: integer('qb_row')
			.notNull()
			.references(() => qb.id, { onDelete: 'cascade' }),
		status: smartOrderStatusEnum('status').notNull(),
		availableQuantity: integer('available_quantity'),
		dailyDepletion: integer('daily_depletion_milli'),
		projectedStockoutAt: bigint('projected_stockout_at', { mode: 'number' }),
		sampleCount: integer('sample_count').notNull(),
		spanDays: integer('span_days_milli').notNull(),
		observedDepletion: integer('observed_depletion').notNull(),
		observedDays: integer('observed_days_milli').notNull(),
		restockCount: integer('restock_count').notNull(),
		incomingPurchaseOrder: integer('incoming_purchase_order'),
		quantityOnHand: integer('quantity_on_hand'),
		quantityOnSalesOrder: integer('quantity_on_sales_order'),
		suggestedQuantity: integer('suggested_quantity'),
		computedAt: bigint('computed_at', { mode: 'number' }).notNull(),
		dismissedAt: bigint('dismissed_at', { mode: 'number' }),
		snoozedUntil: bigint('snoozed_until', { mode: 'number' })
	},
	(forecast) => [
		uniqueIndex('smart_order_forecasts_qb_row_idx').on(forecast.qbRow),
		index('smart_order_forecasts_status_idx').on(forecast.status)
	]
);
export const smartOrderForecastRelations = relations(smartOrderForecasts, ({ one }) => ({
	qbItem: one(qb, { fields: [smartOrderForecasts.qbRow], references: [qb.id] })
}));
