import { and, eq, gte, sql } from 'drizzle-orm';
import { work } from '../../utils/workerBase';
import { qb, qbInventoryHistory, smartOrderForecasts } from '../../db.schema';
import { calculateForecast, effectiveAvailable, HISTORY_WINDOW_DAYS } from './forecast';

work({
	process: async ({ db, progress }) => {
		const now = Date.now();
		const items = await db.query.qb.findMany({
			where: and(eq(qb.deleted, false), eq(qb.type, 'Inventory Part'))
		});
		if (items.length === 0) return;
		const history = await db
			.select()
			.from(qbInventoryHistory)
			.innerJoin(qb, eq(qb.id, qbInventoryHistory.qbRow))
			.where(
				and(
					eq(qb.deleted, false),
					eq(qb.type, 'Inventory Part'),
					gte(qbInventoryHistory.recordedAt, now - HISTORY_WINDOW_DAYS * 86400000)
				)
			)
			.orderBy(qbInventoryHistory.recordedAt);
		const byItem = new Map<number, typeof history>();
		for (const point of history) {
			const id = point.qb_inventory_history.qbRow;
			const bucket = byItem.get(id);
			if (bucket) bucket.push(point);
			else byItem.set(id, [point]);
		}
		const values = items.map((item) => {
			const available = effectiveAvailable(item.quantityOnHand, item.quantityOnSalesOrder);
			const result = calculateForecast(
				(byItem.get(item.id) ?? []).map((point) => ({
					recordedAt: point.qb_inventory_history.recordedAt,
					availableQuantity: effectiveAvailable(
						point.qb_inventory_history.quantityOnHand,
						point.qb_inventory_history.quantityOnSalesOrder
					)
				})),
				available,
				item.quantityOnPurchaseOrder,
				{ now, currentSalesOrder: item.quantityOnSalesOrder }
			);
			return {
				qbRow: item.id,
				status: result.status,
				availableQuantity: result.availableQuantity,
				dailyDepletion:
					result.dailyDepletion === null ? null : Math.round(result.dailyDepletion * 1000),
				projectedStockoutAt: result.projectedStockoutAt,
				sampleCount: result.sampleCount,
				spanDays: Math.round(result.spanDays * 1000),
				observedDepletion: Math.round(result.observedDepletion),
				observedDays: Math.round(result.observedDays * 1000),
				restockCount: result.restockCount,
				incomingPurchaseOrder: item.quantityOnPurchaseOrder,
				quantityOnHand: item.quantityOnHand,
				quantityOnSalesOrder: item.quantityOnSalesOrder,
				suggestedQuantity: result.suggestedQuantity,
				computedAt: now
			};
		});
		await db.transaction(async (tx) => {
			for (let start = 0; start < values.length; start += 400) {
				const chunk = values.slice(start, start + 400);
				await tx
					.insert(smartOrderForecasts)
					.values(chunk)
					.onConflictDoUpdate({
						target: smartOrderForecasts.qbRow,
						// `dismissedAt` and `snoozedUntil` are deliberately absent: they belong to the
						// user, not the calculation, so a recalculation leaves whatever is already
						// stored. Reading them first and writing them back would lose any dismissal
						// made while this worker was running.
						set: {
							status: sql`excluded.status`,
							availableQuantity: sql`excluded.available_quantity`,
							dailyDepletion: sql`excluded.daily_depletion_milli`,
							projectedStockoutAt: sql`excluded.projected_stockout_at`,
							sampleCount: sql`excluded.sample_count`,
							spanDays: sql`excluded.span_days_milli`,
							observedDepletion: sql`excluded.observed_depletion`,
							observedDays: sql`excluded.observed_days_milli`,
							restockCount: sql`excluded.restock_count`,
							incomingPurchaseOrder: sql`excluded.incoming_purchase_order`,
							quantityOnHand: sql`excluded.quantity_on_hand`,
							quantityOnSalesOrder: sql`excluded.quantity_on_sales_order`,
							suggestedQuantity: sql`excluded.suggested_quantity`,
							computedAt: sql`excluded.computed_at`
						}
					});
				progress(((start + chunk.length) / values.length) * 100);
			}
		});
	}
});
