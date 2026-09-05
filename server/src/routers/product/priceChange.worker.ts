import { and, eq, gte, inArray, isNotNull, ne, sql } from 'drizzle-orm';
import { work } from '../../utils/workerBase';
import { priceChanges, qb, unifiedGuild, unifiedProduct, unifiedSpr } from '../../db.schema';
import { reconcilePriceChanges, type PriceChangeCandidate } from './priceChange.reconcile';

const CHUNK = 500;

work({
	process: async ({ db, progress }) => {
		const now = Date.now();

		const rows = await db
			.select({
				productRow: unifiedProduct.id,
				targetPriceCents: unifiedProduct.targetQuickBooksPriceCents,
				inFlyer: unifiedProduct.inFlyer,
				currentPriceCents: qb.priceCents,
				guildPriceCents: unifiedGuild.priceCents,
				sprPriceCents: unifiedSpr.netPriceCents
			})
			.from(unifiedProduct)
			.innerJoin(qb, eq(qb.id, unifiedProduct.qbRow))
			.leftJoin(unifiedGuild, eq(unifiedGuild.id, unifiedProduct.unifiedGuildRow))
			.leftJoin(unifiedSpr, eq(unifiedSpr.id, unifiedProduct.unifiedSprRow))
			.where(
				and(
					eq(unifiedProduct.deleted, false),
					eq(qb.deleted, false),
					isNotNull(unifiedProduct.targetQuickBooksPriceCents),
					// A negative price is the QuickBooks import's marker for a value it could not
					// parse, not a price anything should be compared against.
					gte(qb.priceCents, 0),
					// Guild uses the same sentinel for an invalid source price. Never let it reach
					// the review queue or a QuickBooks export.
					gte(unifiedProduct.targetQuickBooksPriceCents, 0),
					ne(unifiedProduct.targetQuickBooksPriceCents, qb.priceCents)
				)
			);
		progress(25);

		const candidates: PriceChangeCandidate[] = rows.map((row) => ({
			productRow: row.productRow,
			currentPriceCents: row.currentPriceCents,
			targetPriceCents: row.targetPriceCents!,
			inFlyer: row.inFlyer ?? false,
			source: row.guildPriceCents !== null ? 'guild' : row.sprPriceCents !== null ? 'spr' : 'other'
		}));

		const valueColumns = {
			status: sql`excluded.status`,
			currentPriceCents: sql`excluded.current_price_cents`,
			targetPriceCents: sql`excluded.target_price_cents`,
			changePercentMilli: sql`excluded.change_percent_milli`,
			inFlyer: sql`excluded.in_flyer`,
			source: sql`excluded.source`,
			computedAt: sql`excluded.computed_at`
		};

		await db.transaction(async (tx) => {
			// Lock the queue rows before reading their decisions. Review and export updates then
			// either finish before this read or wait until reconciliation commits.
			const stored = await tx
				.select({
					id: priceChanges.id,
					productRow: priceChanges.productRow,
					status: priceChanges.status,
					approvedPriceCents: priceChanges.approvedPriceCents,
					rejectedPriceCents: priceChanges.rejectedPriceCents
				})
				.from(priceChanges)
				.where(eq(priceChanges.channel, 'quickBooks'))
				.orderBy(priceChanges.id)
				.for('update');
			progress(50);

			const { keep, requeue, deleteIds } = reconcilePriceChanges(candidates, stored, now);

			for (let start = 0; start < keep.length; start += CHUNK) {
				await tx
					.insert(priceChanges)
					.values(keep.slice(start, start + CHUNK))
					.onConflictDoUpdate({
						target: [priceChanges.productRow, priceChanges.channel],
						set: valueColumns
					});
				progress(50 + (25 * Math.min(start + CHUNK, keep.length)) / keep.length);
			}
			// Only the re-queued rows need their decision cleared, so they go out as a second pass.
			for (let start = 0; start < requeue.length; start += CHUNK) {
				await tx
					.insert(priceChanges)
					.values(requeue.slice(start, start + CHUNK))
					.onConflictDoUpdate({
						target: [priceChanges.productRow, priceChanges.channel],
						set: {
							...valueColumns,
							approvedPriceCents: null,
							rejectedPriceCents: null,
							decidedAt: null,
							decidedBy: null,
							exportRow: null,
							exportedAt: null
						}
					});
			}
			for (let start = 0; start < deleteIds.length; start += CHUNK) {
				await tx
					.delete(priceChanges)
					.where(inArray(priceChanges.id, deleteIds.slice(start, start + CHUNK)));
			}
		});
		progress(100);
	}
});
