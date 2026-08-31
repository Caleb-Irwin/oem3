import { relations } from 'drizzle-orm';
import {
	bigint,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	varchar
} from 'drizzle-orm/pg-core';
import { qb } from './qb/table';

export const orderPlannerOrderStatusEnum = pgEnum('order_planner_order_status', [
	'draft',
	'sent',
	'completed'
]);

export const orderPlannerOrders = pgTable(
	'order_planner_orders',
	{
		id: serial('id').primaryKey(),
		name: varchar('name', { length: 128 }).notNull(),
		notes: text('notes').notNull().default(''),
		status: orderPlannerOrderStatusEnum('status').notNull().default('draft'),
		createdAt: bigint('created_at', { mode: 'number' }).notNull(),
		createdBy: varchar('created_by', { length: 256 }).notNull()
	},
	(order) => [
		index('order_planner_orders_status_idx').on(order.status),
		// Paging the finished-order history: filter by status, newest first.
		index('order_planner_orders_status_created_at_idx').on(order.status, order.createdAt)
	]
);

export const orderPlannerItems = pgTable(
	'order_planner_items',
	{
		id: serial('id').primaryKey(),
		qbRow: integer('qb_row')
			.notNull()
			.references(() => qb.id, { onDelete: 'cascade' }),
		orderId: integer('order_id').references(() => orderPlannerOrders.id, {
			onDelete: 'set null'
		}),
		addedAt: bigint('added_at', { mode: 'number' }).notNull(),
		addedBy: varchar('added_by', { length: 256 }).notNull()
	},
	(item) => [
		index('order_planner_items_qb_row_idx').on(item.qbRow),
		index('order_planner_items_order_id_idx').on(item.orderId),
		index('order_planner_items_added_at_idx').on(item.addedAt)
	]
);

export const orderPlannerOrdersRelations = relations(orderPlannerOrders, ({ many }) => ({
	items: many(orderPlannerItems)
}));

export const orderPlannerItemsRelations = relations(orderPlannerItems, ({ one }) => ({
	qbItem: one(qb, { fields: [orderPlannerItems.qbRow], references: [qb.id] }),
	order: one(orderPlannerOrders, {
		fields: [orderPlannerItems.orderId],
		references: [orderPlannerOrders.id]
	})
}));
