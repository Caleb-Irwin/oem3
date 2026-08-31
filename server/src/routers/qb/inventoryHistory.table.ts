import { relations } from 'drizzle-orm';
import { bigint, index, integer, pgTable, serial, uniqueIndex } from 'drizzle-orm/pg-core';
import { qb } from './table';

/**
 * One local-inventory snapshot per active QuickBooks item and import. Quantities only ever
 * change through an import, so every snapshot belongs to the file that produced it.
 */
export const qbInventoryHistory = pgTable(
	'qb_inventory_history',
	{
		id: serial('id').primaryKey(),
		qbRow: integer('qb_row')
			.notNull()
			.references(() => qb.id, { onDelete: 'cascade' }),
		quantityOnHand: integer('quantity_on_hand'),
		quantityOnSalesOrder: integer('quantity_on_sales_order'),
		quantityOnPurchaseOrder: integer('quantity_on_purchase_order'),
		sourceFile: integer('source_file').notNull(),
		recordedAt: bigint('recorded_at', { mode: 'number' }).notNull()
	},
	(history) => [
		uniqueIndex('qb_inventory_history_qb_row_source_file_idx').on(
			history.qbRow,
			history.sourceFile
		),
		index('qb_inventory_history_qb_row_recorded_at_idx').on(history.qbRow, history.recordedAt),
		index('qb_inventory_history_recorded_at_idx').on(history.recordedAt)
	]
);

export const qbInventoryHistoryRelations = relations(qbInventoryHistory, ({ one }) => ({
	qbItem: one(qb, { fields: [qbInventoryHistory.qbRow], references: [qb.id] })
}));
