import { TRPCError } from '@trpc/server';
import { and, asc, count, desc, eq, gte, inArray, isNull, ne, or, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import {
	orderPlannerItems,
	orderPlannerOrders,
	orderPlannerOrderStatusEnum,
	qb,
	qbInventoryHistory,
	unifiedProduct,
	uniref
} from '../db.schema';
import { generalProcedure, router, viewerProcedure } from '../trpc';
import { eventSubscription } from '../utils/eventSubscription';
import { qbHook } from './qb';

const { update, createSub } = eventSubscription();
const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Builds the full item shape shown in the planner for whichever rows `where` selects. */
async function loadItems(where: SQL) {
	const rows = await db
		.select({
			id: orderPlannerItems.id,
			qbRow: orderPlannerItems.qbRow,
			orderId: orderPlannerItems.orderId,
			addedAt: orderPlannerItems.addedAt,
			addedBy: orderPlannerItems.addedBy,
			qbId: qb.qbId,
			productName: qb.productName,
			description: qb.desc,
			upc: qb.upc,
			quantityOnHand: qb.quantityOnHand,
			quantityOnSalesOrder: qb.quantityOnSalesOrder,
			quantityOnPurchaseOrder: qb.quantityOnPurchaseOrder,
			preferredVendor: qb.preferredVendor,
			unifiedVendor: unifiedProduct.vendor,
			primaryImage: unifiedProduct.primaryImage,
			primaryImageDescription: unifiedProduct.primaryImageDescription,
			uniId: uniref.uniId,
			orderName: orderPlannerOrders.name,
			orderStatus: orderPlannerOrders.status
		})
		.from(orderPlannerItems)
		.innerJoin(qb, and(eq(orderPlannerItems.qbRow, qb.id), eq(qb.deleted, false)))
		.leftJoin(unifiedProduct, eq(unifiedProduct.qbRow, qb.id))
		.leftJoin(uniref, eq(uniref.unifiedProduct, unifiedProduct.id))
		.leftJoin(orderPlannerOrders, eq(orderPlannerItems.orderId, orderPlannerOrders.id))
		.where(where)
		.orderBy(asc(orderPlannerItems.addedAt));

	const qbRows = rows.map((row) => row.qbRow);
	const history =
		qbRows.length === 0
			? []
			: await db
					.select({
						qbRow: qbInventoryHistory.qbRow,
						quantityOnHand: qbInventoryHistory.quantityOnHand,
						quantityOnSalesOrder: qbInventoryHistory.quantityOnSalesOrder,
						quantityOnPurchaseOrder: qbInventoryHistory.quantityOnPurchaseOrder,
						recordedAt: qbInventoryHistory.recordedAt
					})
					.from(qbInventoryHistory)
					.where(
						and(
							inArray(qbInventoryHistory.qbRow, qbRows),
							gte(qbInventoryHistory.recordedAt, Date.now() - HISTORY_WINDOW_MS)
						)
					)
					.orderBy(asc(qbInventoryHistory.recordedAt));

	const historyByQbRow = new Map<number, typeof history>();
	for (const point of history) {
		const itemHistory = historyByQbRow.get(point.qbRow) ?? [];
		itemHistory.push(point);
		historyByQbRow.set(point.qbRow, itemHistory);
	}

	return rows.map((row) => ({
		...row,
		vendor: row.preferredVendor?.trim() || row.unifiedVendor?.trim() || null,
		availableQuantity:
			row.quantityOnHand === null ? null : row.quantityOnHand - (row.quantityOnSalesOrder ?? 0),
		history: historyByQbRow.get(row.qbRow) ?? []
	}));
}

/**
 * The live payload covers open work only. Completed orders pile up for years, so they and
 * their items are paged in through `history` and `order.items` instead of riding along on
 * every subscription push.
 */
async function getOrderPlanner() {
	const orders = await db
		.select()
		.from(orderPlannerOrders)
		.where(ne(orderPlannerOrders.status, 'completed'))
		.orderBy(asc(orderPlannerOrders.createdAt));

	const openOrderIds = orders.map((order) => order.id);
	const items = await loadItems(
		openOrderIds.length === 0
			? isNull(orderPlannerItems.orderId)
			: or(isNull(orderPlannerItems.orderId), inArray(orderPlannerItems.orderId, openOrderIds))!
	);

	const [completed] = await db
		.select({ count: count() })
		.from(orderPlannerOrders)
		.where(eq(orderPlannerOrders.status, 'completed'));

	return { items, orders, completedCount: completed?.count ?? 0 };
}

async function assertOrder(orderId: number) {
	const order = await db.query.orderPlannerOrders.findFirst({
		where: eq(orderPlannerOrders.id, orderId)
	});
	if (!order) throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
	return order;
}

function assertOpen(order: { status: (typeof orderPlannerOrderStatusEnum.enumValues)[number] }) {
	if (order.status === 'completed') {
		throw new TRPCError({ code: 'CONFLICT', message: 'Completed orders cannot be changed' });
	}
	return order;
}

const itemIdsInput = z.object({ itemIds: z.array(z.number().int().positive()).min(1) });

export const orderPlannerRouter = router({
	get: viewerProcedure.query(getOrderPlanner),
	getSub: createSub(async () => getOrderPlanner()),
	/** One page of finished orders, newest first, so the history list never loads in full. */
	history: viewerProcedure
		.input(
			z.object({
				limit: z.number().int().min(1).max(100).default(20),
				offset: z.number().int().min(0).default(0)
			})
		)
		.query(async ({ input: { limit, offset } }) => {
			const orders = await db
				.select()
				.from(orderPlannerOrders)
				.where(eq(orderPlannerOrders.status, 'completed'))
				.orderBy(desc(orderPlannerOrders.createdAt))
				.limit(limit)
				.offset(offset);
			if (orders.length === 0) return [];

			// Counted for this page only; grouping every finished order would undo the paging.
			const counts = await db
				.select({ orderId: orderPlannerItems.orderId, itemCount: count() })
				.from(orderPlannerItems)
				.where(
					inArray(
						orderPlannerItems.orderId,
						orders.map((order) => order.id)
					)
				)
				.groupBy(orderPlannerItems.orderId);
			const countByOrder = new Map(counts.map((row) => [row.orderId, row.itemCount]));
			return orders.map((order) => ({ ...order, itemCount: countByOrder.get(order.id) ?? 0 }));
		}),
	flag: generalProcedure
		.input(
			z.object({
				qbRow: z.number().int().positive(),
				allowDuplicate: z.boolean().default(false)
			})
		)
		.mutation(async ({ ctx, input: { qbRow, allowDuplicate } }) => {
			const item = await db.query.qb.findFirst({ where: eq(qb.id, qbRow) });
			if (!item || item.deleted || item.type !== 'Inventory Part') {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Only active QuickBooks inventory items can be flagged'
				});
			}

			// Matches the warning the client shows: a row left behind in a completed order is a
			// finished purchase, not a place the item still sits.
			const existing = await db
				.select({ id: orderPlannerItems.id })
				.from(orderPlannerItems)
				.leftJoin(orderPlannerOrders, eq(orderPlannerItems.orderId, orderPlannerOrders.id))
				.where(
					and(
						eq(orderPlannerItems.qbRow, qbRow),
						or(isNull(orderPlannerItems.orderId), ne(orderPlannerOrders.status, 'completed'))
					)
				)
				.limit(1);
			if (existing.length > 0 && !allowDuplicate) {
				throw new TRPCError({ code: 'CONFLICT', message: 'This item is already on the list' });
			}

			const [created] = await db
				.insert(orderPlannerItems)
				.values({ qbRow, addedAt: Date.now(), addedBy: ctx.user.username })
				.returning({ id: orderPlannerItems.id });
			update();
			return created;
		}),
	remove: generalProcedure
		.input(z.object({ id: z.number().int().positive() }))
		.mutation(async ({ input: { id } }) => {
			await db.delete(orderPlannerItems).where(eq(orderPlannerItems.id, id));
			update();
		}),
	assign: generalProcedure
		.input(itemIdsInput.extend({ orderId: z.number().int().positive().nullable() }))
		.mutation(async ({ input: { itemIds, orderId } }) => {
			if (orderId !== null) assertOpen(await assertOrder(orderId));
			await db
				.update(orderPlannerItems)
				.set({ orderId })
				.where(inArray(orderPlannerItems.id, itemIds));
			update();
		}),
	addToOrder: generalProcedure
		.input(itemIdsInput.extend({ orderId: z.number().int().positive() }))
		.mutation(async ({ ctx, input: { itemIds, orderId } }) => {
			assertOpen(await assertOrder(orderId));

			const sourceItems = await db
				.select()
				.from(orderPlannerItems)
				.where(inArray(orderPlannerItems.id, itemIds));
			const uniqueSources = [
				...new Map(sourceItems.map((item) => [item.qbRow, item] as const)).values()
			];
			if (uniqueSources.length === 0) {
				throw new TRPCError({ code: 'NOT_FOUND', message: 'No low-stock items were found' });
			}

			const qbRows = uniqueSources.map((item) => item.qbRow);
			const existingTargetRows = await db
				.select({ qbRow: orderPlannerItems.qbRow })
				.from(orderPlannerItems)
				.where(
					and(eq(orderPlannerItems.orderId, orderId), inArray(orderPlannerItems.qbRow, qbRows))
				);
			const existingQbRows = new Set(existingTargetRows.map((item) => item.qbRow));
			const additions = uniqueSources.filter((item) => !existingQbRows.has(item.qbRow));
			const unassigned = additions.filter((item) => item.orderId === null);
			const duplicates = additions.filter((item) => item.orderId !== null);

			if (unassigned.length > 0) {
				await db
					.update(orderPlannerItems)
					.set({ orderId })
					.where(
						inArray(
							orderPlannerItems.id,
							unassigned.map((item) => item.id)
						)
					);
			}
			if (duplicates.length > 0) {
				await db.insert(orderPlannerItems).values(
					duplicates.map((item) => ({
						qbRow: item.qbRow,
						orderId,
						addedAt: Date.now(),
						addedBy: ctx.user.username
					}))
				);
			}

			update();
			return {
				added: additions.length,
				duplicated: duplicates.length,
				skipped: uniqueSources.length - additions.length
			};
		}),
	order: router({
		/** Items for one order, loaded on demand when a finished order is opened from history. */
		items: viewerProcedure
			.input(z.object({ id: z.number().int().positive() }))
			.query(async ({ input: { id } }) => loadItems(eq(orderPlannerItems.orderId, id))),
		create: generalProcedure
			.input(
				z.object({
					name: z.string().trim().min(1).max(128),
					notes: z.string().trim().max(4000).optional()
				})
			)
			.mutation(async ({ ctx, input: { name, notes } }) => {
				const [order] = await db
					.insert(orderPlannerOrders)
					.values({ name, notes: notes ?? '', createdAt: Date.now(), createdBy: ctx.user.username })
					.returning();
				update();
				return order;
			}),
		setStatus: generalProcedure
			.input(
				z.object({
					id: z.number().int().positive(),
					status: z.enum(orderPlannerOrderStatusEnum.enumValues)
				})
			)
			.mutation(async ({ input: { id, status } }) => {
				await assertOrder(id);
				await db.update(orderPlannerOrders).set({ status }).where(eq(orderPlannerOrders.id, id));
				update();
			}),
		rename: generalProcedure
			.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(128) }))
			.mutation(async ({ input: { id, name } }) => {
				await assertOrder(id);
				await db.update(orderPlannerOrders).set({ name }).where(eq(orderPlannerOrders.id, id));
				update();
			}),
		setNotes: generalProcedure
			.input(z.object({ id: z.number().int().positive(), notes: z.string().trim().max(4000) }))
			.mutation(async ({ input: { id, notes } }) => {
				await assertOrder(id);
				await db.update(orderPlannerOrders).set({ notes }).where(eq(orderPlannerOrders.id, id));
				update();
			}),
		delete: generalProcedure
			.input(z.object({ id: z.number().int().positive() }))
			.mutation(async ({ input: { id } }) => {
				const order = await assertOrder(id);
				if (order.status !== 'draft') {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'Only draft orders can be deleted'
					});
				}
				await db.delete(orderPlannerOrders).where(eq(orderPlannerOrders.id, id));
				update();
			})
	})
});

// QuickBooks quantities and the chart should update together after an import.
qbHook(() => update());
