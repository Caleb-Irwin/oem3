import { TRPCError } from '@trpc/server';
import { and, desc, eq, gt, gte, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { generalProcedure, router, viewerProcedure } from '../../trpc';
import {
	smartOrderForecasts,
	qb,
	unifiedProduct,
	orderPlannerItems,
	orderPlannerOrders,
	qbInventoryHistory,
	uniref
} from '../../db.schema';
import { managedWorker } from '../../utils/managedWorker';
import { qbHook } from '../qb';
import { effectiveAvailable, HISTORY_DISPLAY_DAYS, PLAN_DAYS, SOON_DAYS } from './forecast';
import { orderPlannerEvents, smartOrderEvents } from './events';
import { calendarSnoozeUntil, stockoutSnoozeUntil } from './snooze';

const { update: updateSmartOrder, createSub: createSmartOrderSub } = smartOrderEvents;

const {
	worker,
	runWorker,
	hook: smartOrderWorkerHook
} = managedWorker(new URL('smartOrder.worker.ts', import.meta.url).href, 'smartOrder', [qbHook]);

smartOrderWorkerHook(() => smartOrderEvents.update());

/**
 * A forecast the user has parked. These stay visible under the Slept and Permanently dismissed
 * filters no matter what the recalculated status is, so a restock that drops an item out of the
 * urgent range can never strand a dismissal the user is unable to undo.
 */
const paused = (currentTime: number) =>
	or(isNotNull(smartOrderForecasts.dismissedAt), gt(smartOrderForecasts.snoozedUntil, currentTime));

async function loadSmartSummaryDb() {
	const currentTime = Date.now();
	const planned = db
		.selectDistinct({ qbRow: orderPlannerItems.qbRow })
		.from(orderPlannerItems)
		.leftJoin(orderPlannerOrders, eq(orderPlannerItems.orderId, orderPlannerOrders.id))
		.where(or(isNull(orderPlannerItems.orderId), ne(orderPlannerOrders.status, 'completed')))
		.as('planned');
	const live = and(eq(qb.deleted, false), eq(qb.type, 'Inventory Part'));
	const open = sql`${smartOrderForecasts.dismissedAt} is null and (${smartOrderForecasts.snoozedUntil} is null or ${smartOrderForecasts.snoozedUntil} <= ${currentTime})`;
	const [row, [latestSnapshot]] = await Promise.all([
		db
			.select({
				computedAt: sql<number>`coalesce(max(${smartOrderForecasts.computedAt}), 0)`,
				insufficient: sql<number>`count(*) filter (where ${smartOrderForecasts.status} = 'insufficient')`,
				// Counted across every status, matching what the Slept and Permanently dismissed
				// filters actually list.
				dismissed: sql<number>`count(*) filter (where ${smartOrderForecasts.dismissedAt} is not null)`,
				snoozed: sql<number>`count(*) filter (where ${smartOrderForecasts.dismissedAt} is null and ${smartOrderForecasts.snoozedUntil} > ${currentTime})`,
				alreadyPlanned: sql<number>`count(*) filter (where ${smartOrderForecasts.status} in ('now','soon') and ${planned.qbRow} is not null and ${open})`,
				now: sql<number>`count(*) filter (where ${smartOrderForecasts.status} = 'now' and ${planned.qbRow} is null and ${open})`,
				soon: sql<number>`count(*) filter (where ${smartOrderForecasts.status} = 'soon' and ${planned.qbRow} is null and ${open})`
			})
			.from(smartOrderForecasts)
			.innerJoin(qb, eq(qb.id, smartOrderForecasts.qbRow))
			.leftJoin(planned, eq(planned.qbRow, smartOrderForecasts.qbRow))
			.where(live)
			.then((rows) => rows[0]),
		db
			.select({ recordedAt: qbInventoryHistory.recordedAt })
			.from(qbInventoryHistory)
			.innerJoin(qb, eq(qb.id, qbInventoryHistory.qbRow))
			.where(live)
			.orderBy(desc(qbInventoryHistory.recordedAt))
			.limit(1)
	]);
	const computedAt = Number(row?.computedAt ?? 0);
	return {
		computedAt,
		now: Number(row?.now ?? 0),
		soon: Number(row?.soon ?? 0),
		insufficient: Number(row?.insufficient ?? 0),
		dismissed: Number(row?.dismissed ?? 0),
		snoozed: Number(row?.snoozed ?? 0),
		alreadyPlanned: Number(row?.alreadyPlanned ?? 0),
		latestSnapshotAt: latestSnapshot?.recordedAt ?? null,
		stale: (latestSnapshot?.recordedAt ?? 0) > computedAt,
		planDays: PLAN_DAYS,
		soonDays: SOON_DAYS,
		historyDays: HISTORY_DISPLAY_DAYS
	};
}

async function loadSmartOrder() {
	const currentTime = Date.now();
	const rows = await db
		.select({
			qbRow: qb.id,
			qbId: qb.qbId,
			productName: qb.productName,
			description: qb.desc,
			upc: qb.upc,
			preferredVendor: qb.preferredVendor,
			vendor: unifiedProduct.vendor,
			primaryImage: unifiedProduct.primaryImage,
			primaryImageDescription: unifiedProduct.primaryImageDescription,
			uniId: uniref.uniId,
			forecast: smartOrderForecasts
		})
		.from(smartOrderForecasts)
		.innerJoin(qb, eq(qb.id, smartOrderForecasts.qbRow))
		.leftJoin(unifiedProduct, eq(unifiedProduct.qbRow, qb.id))
		.leftJoin(uniref, eq(uniref.unifiedProduct, unifiedProduct.id))
		.where(
			and(
				eq(qb.deleted, false),
				eq(qb.type, 'Inventory Part'),
				or(
					eq(smartOrderForecasts.status, 'now'),
					eq(smartOrderForecasts.status, 'soon'),
					paused(currentTime)
				)
			)
		);
	const qbRows = rows.map((row) => row.qbRow);
	const [unfinished, history] =
		qbRows.length === 0
			? [[], []]
			: await Promise.all([
					db
						.select({ qbRow: orderPlannerItems.qbRow })
						.from(orderPlannerItems)
						.leftJoin(orderPlannerOrders, eq(orderPlannerItems.orderId, orderPlannerOrders.id))
						.where(
							and(
								inArray(orderPlannerItems.qbRow, qbRows),
								or(isNull(orderPlannerItems.orderId), ne(orderPlannerOrders.status, 'completed'))
							)
						),
					db
						.select({
							qbRow: qbInventoryHistory.qbRow,
							quantityOnHand: qbInventoryHistory.quantityOnHand,
							quantityOnSalesOrder: qbInventoryHistory.quantityOnSalesOrder,
							recordedAt: qbInventoryHistory.recordedAt
						})
						.from(qbInventoryHistory)
						.where(
							and(
								inArray(qbInventoryHistory.qbRow, qbRows),
								gte(qbInventoryHistory.recordedAt, currentTime - HISTORY_DISPLAY_DAYS * 86400000)
							)
						)
						.orderBy(qbInventoryHistory.recordedAt)
				]);
	const plannedRows = new Set(unfinished.map((row) => row.qbRow));
	// The chart plots the same series the forecast is built from, so the projected run-out
	// line starts where the history actually ends.
	const historyByItem = new Map<number, { value: number | null; recordedAt: number }[]>();
	for (const point of history) {
		const value = effectiveAvailable(point.quantityOnHand, point.quantityOnSalesOrder);
		const bucket = historyByItem.get(point.qbRow);
		if (bucket) bucket.push({ value, recordedAt: point.recordedAt });
		else historyByItem.set(point.qbRow, [{ value, recordedAt: point.recordedAt }]);
	}
	const items = rows.map(({ forecast, preferredVendor, vendor, ...item }) => ({
		...item,
		vendor: preferredVendor?.trim() || vendor?.trim() || null,
		// Every quantity below comes from the same forecast run, so the suggestion and the
		// numbers explaining it always add up. `summary.computedAt` dates the whole page.
		status: forecast.status,
		quantityOnHand: forecast.quantityOnHand,
		quantityOnSalesOrder: forecast.quantityOnSalesOrder,
		quantityOnPurchaseOrder: forecast.incomingPurchaseOrder,
		availableQuantity: forecast.availableQuantity,
		suggestedQuantity: forecast.suggestedQuantity,
		projectedStockoutAt: forecast.projectedStockoutAt,
		sampleCount: forecast.sampleCount,
		restockCount: forecast.restockCount,
		observedDepletion: forecast.observedDepletion,
		// Stored as thousandths so the columns stay integral; see smartOrder.table.ts.
		dailyDepletion: forecast.dailyDepletion === null ? null : forecast.dailyDepletion / 1000,
		spanDays: forecast.spanDays / 1000,
		observedDays: forecast.observedDays / 1000,
		dismissed: forecast.dismissedAt !== null,
		snoozed: forecast.snoozedUntil !== null && forecast.snoozedUntil > currentTime,
		snoozedUntil: forecast.snoozedUntil,
		alreadyPlanned: plannedRows.has(item.qbRow),
		history: historyByItem.get(item.qbRow) ?? []
	}));
	return { items, summary: await loadSmartSummaryDb() };
}

const qbRowsInput = z.object({ qbRows: z.array(z.number().int().positive()).min(1) });

/** Clears a user-set pause. `wake` drops the snooze, `restore` drops the dismissal. */
const clearPause = (column: 'snoozedUntil' | 'dismissedAt') =>
	generalProcedure.input(qbRowsInput).mutation(async ({ input }) => {
		const updated = await db
			.update(smartOrderForecasts)
			.set({ [column]: null })
			.where(inArray(smartOrderForecasts.qbRow, [...new Set(input.qbRows)]))
			.returning({ qbRow: smartOrderForecasts.qbRow });
		updateSmartOrder();
		return { updated: updated.length, qbRows: updated.map((row) => row.qbRow) };
	});

export const smartOrderRouter = router({
	worker,
	get: viewerProcedure.query(loadSmartOrder),
	getSub: createSmartOrderSub(async () => loadSmartOrder()),
	summary: viewerProcedure.query(loadSmartSummaryDb),
	summarySub: createSmartOrderSub(async () => loadSmartSummaryDb()),
	dismiss: generalProcedure.input(qbRowsInput).mutation(async ({ input }) => {
		const updated = await db
			.update(smartOrderForecasts)
			.set({ dismissedAt: Date.now() })
			.where(inArray(smartOrderForecasts.qbRow, [...new Set(input.qbRows)]))
			.returning({ qbRow: smartOrderForecasts.qbRow });
		if (updated.length === 0)
			throw new TRPCError({ code: 'NOT_FOUND', message: 'Smart Order forecast not found' });
		updateSmartOrder();
		return { updated: updated.length, qbRows: updated.map((row) => row.qbRow) };
	}),
	wake: clearPause('snoozedUntil'),
	restore: clearPause('dismissedAt'),
	snooze: generalProcedure
		.input(qbRowsInput.extend({ preset: z.enum(['stockout', 'oneMonth', 'threeMonths']) }))
		.mutation(async ({ input }) => {
			const qbRows = [...new Set(input.qbRows)];
			const now = Date.now();
			if (input.preset !== 'stockout') {
				const until = calendarSnoozeUntil(now, input.preset === 'oneMonth' ? 1 : 3);
				const updated = await db
					.update(smartOrderForecasts)
					.set({ snoozedUntil: until })
					.where(inArray(smartOrderForecasts.qbRow, qbRows))
					.returning({ qbRow: smartOrderForecasts.qbRow });
				if (updated.length === 0)
					throw new TRPCError({ code: 'NOT_FOUND', message: 'Smart Order forecast not found' });
				updateSmartOrder();
				return { updated: updated.length, skipped: 0 };
			}
			// Sleeping until run-out only means something for items that have one ahead of them.
			const rows = await db
				.select({
					qbRow: smartOrderForecasts.qbRow,
					projectedStockoutAt: smartOrderForecasts.projectedStockoutAt
				})
				.from(smartOrderForecasts)
				.where(inArray(smartOrderForecasts.qbRow, qbRows));
			if (rows.length === 0)
				throw new TRPCError({ code: 'NOT_FOUND', message: 'Smart Order forecast not found' });
			const eligible = rows.filter(
				(row) => stockoutSnoozeUntil(now, row.projectedStockoutAt) !== null
			);
			if (eligible.length === 0)
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'No selected item has a future projected run-out date'
				});
			await db
				.update(smartOrderForecasts)
				.set({ snoozedUntil: sql`${smartOrderForecasts.projectedStockoutAt}` })
				.where(
					inArray(
						smartOrderForecasts.qbRow,
						eligible.map((row) => row.qbRow)
					)
				);
			updateSmartOrder();
			return { updated: eligible.length, skipped: rows.length - eligible.length };
		}),
	addToOrder: generalProcedure
		.input(qbRowsInput.extend({ orderId: z.number().int().positive() }))
		.mutation(async ({ ctx, input }) => {
			const result = await db.transaction(async (tx) => {
				const [order] = await tx
					.select()
					.from(orderPlannerOrders)
					.where(eq(orderPlannerOrders.id, input.orderId))
					.for('update');
				if (!order || order.status === 'completed')
					throw new TRPCError({ code: 'CONFLICT', message: 'Order is not open' });
				const qbRows = [...new Set(input.qbRows)];
				const forecasts = await tx
					.select()
					.from(smartOrderForecasts)
					.innerJoin(qb, eq(qb.id, smartOrderForecasts.qbRow))
					.where(
						and(
							eq(qb.deleted, false),
							eq(qb.type, 'Inventory Part'),
							inArray(smartOrderForecasts.qbRow, qbRows)
						)
					)
					.orderBy(smartOrderForecasts.qbRow)
					.for('update');
				const valid = new Map(
					forecasts.map((row) => [row.smart_order_forecasts.qbRow, row.smart_order_forecasts])
				);
				const planned = await tx
					.select({ qbRow: orderPlannerItems.qbRow })
					.from(orderPlannerItems)
					.leftJoin(orderPlannerOrders, eq(orderPlannerItems.orderId, orderPlannerOrders.id))
					.where(
						and(
							inArray(orderPlannerItems.qbRow, qbRows),
							or(isNull(orderPlannerItems.orderId), ne(orderPlannerOrders.status, 'completed'))
						)
					);
				const plannedRows = new Set(planned.map((row) => row.qbRow));
				let added = 0,
					skipped = 0;
				const addedQbRows: number[] = [];
				for (const qbRow of qbRows) {
					const forecast = valid.get(qbRow);
					if (
						plannedRows.has(qbRow) ||
						!forecast ||
						(forecast.status !== 'now' && forecast.status !== 'soon') ||
						forecast.dismissedAt !== null ||
						(forecast.snoozedUntil ?? 0) > Date.now()
					) {
						skipped++;
						continue;
					}
					const [target] = await tx
						.select()
						.from(orderPlannerItems)
						.where(
							and(eq(orderPlannerItems.qbRow, qbRow), eq(orderPlannerItems.orderId, input.orderId))
						)
						.limit(1);
					if (target) {
						skipped++;
						continue;
					}
					const [unassigned] = await tx
						.select()
						.from(orderPlannerItems)
						.where(and(eq(orderPlannerItems.qbRow, qbRow), isNull(orderPlannerItems.orderId)))
						.limit(1);
					if (unassigned)
						await tx
							.update(orderPlannerItems)
							.set({ orderId: input.orderId })
							.where(eq(orderPlannerItems.id, unassigned.id));
					else {
						await tx.insert(orderPlannerItems).values({
							qbRow,
							orderId: input.orderId,
							addedAt: Date.now(),
							addedBy: ctx.user.username
						});
					}
					added++;
					addedQbRows.push(qbRow);
				}
				return { added, skipped, addedQbRows };
			});
			orderPlannerEvents.update();
			updateSmartOrder();
			return result;
		}),
	refresh: generalProcedure.mutation(async () => {
		await runWorker({});
	})
});
