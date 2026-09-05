import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, ne, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { db, type Tx } from '../../db';
import { generalProcedure, router, viewerProcedure } from '../../trpc';
import {
	labelSheets,
	labels,
	priceChangeCategoryEnum,
	priceChangeExportItems,
	priceChangeExports,
	priceChanges,
	qb,
	shopify,
	unifiedGuild,
	unifiedProduct,
	unifiedProductCellConfig,
	unifiedSpr,
	uniref,
	type PriceChangeCategory
} from '../../db.schema';
import { getCellConfigHelper } from '../../unified/cellConfigHelper';
import { eventSubscription } from '../../utils/eventSubscription';
import { managedWorker } from '../../utils/managedWorker';
import { unifiedOnUpdateCallback } from '../unified.helpers';
import { notifyLabelsUpdated } from '../labels';
import { productHook } from './index';
import { buildQuickBooksPriceCsv } from './priceChange.csv';
import { reconcilePriceChanges, type PriceChangeCandidate } from './priceChange.reconcile';
import { notifyPriceListUpdated } from './priceList';
import { sprSellPriceCents, suggestQuickBooksConversion } from './pricing';

const { update: updatePriceChanges, createSub } = eventSubscription();

const { worker, hook: priceChangeWorkerHook } = managedWorker(
	new URL('priceChange.worker.ts', import.meta.url).href,
	'priceChange',
	[productHook]
);

priceChangeWorkerHook(() => updatePriceChanges());

/** How many rows of one status the review page is given at a time. */
const LIST_LIMIT = 400;

/** The two cells a reviewer can pin a price to from this workflow. */
const CUSTOM_PRICE_COLUMNS = ['onlinePriceCents', 'targetQuickBooksPriceCents'] as const;
type CustomPriceColumn = (typeof CUSTOM_PRICE_COLUMNS)[number];
const CONVERSION_COLUMNS = [
	'sourceToQuickBooksFactor',
	'quickBooksConversionAdjustmentPercent'
] as const;
const customSettingTypes = ['setting:custom', 'setting:approveCustom'] as const;

const categoryInput = z.enum(priceChangeCategoryEnum.enumValues).default('all');

/** Flyer items live in their own scope and never repeat in another review queue. */
function categoryFilter(category: PriceChangeCategory): SQL | undefined {
	if (category === 'flyer') return eq(priceChanges.inFlyer, true);
	if (category === 'guild')
		return and(eq(priceChanges.inFlyer, false), eq(priceChanges.source, 'guild'));
	if (category === 'spr')
		return and(eq(priceChanges.inFlyer, false), eq(priceChanges.source, 'spr'));
	return eq(priceChanges.inFlyer, false);
}

const onlineSetting = alias(unifiedProductCellConfig, 'online_price_setting');
const qbSetting = alias(unifiedProductCellConfig, 'qb_price_setting');
const conversionFactorSetting = alias(unifiedProductCellConfig, 'conversion_factor_setting');
const conversionAdjustmentSetting = alias(
	unifiedProductCellConfig,
	'conversion_adjustment_setting'
);

const listQuery = (database: typeof db | Tx = db) =>
	database
		.select({
			id: priceChanges.id,
			productRow: priceChanges.productRow,
			status: priceChanges.status,
			currentPriceCents: priceChanges.currentPriceCents,
			targetPriceCents: priceChanges.targetPriceCents,
			changePercentMilli: priceChanges.changePercentMilli,
			inFlyer: priceChanges.inFlyer,
			source: priceChanges.source,
			decidedAt: priceChanges.decidedAt,
			decidedBy: priceChanges.decidedBy,
			exportRow: priceChanges.exportRow,
			exportedAt: priceChanges.exportedAt,
			uniId: uniref.uniId,
			title: unifiedProduct.title,
			gid: unifiedProduct.gid,
			sprc: unifiedProduct.sprc,
			upc: unifiedProduct.upc,
			primaryImage: unifiedProduct.primaryImage,
			primaryImageDescription: unifiedProduct.primaryImageDescription,
			um: unifiedProduct.um,
			qtyPerUm: unifiedProduct.qtyPerUm,
			sourceToQuickBooksFactor: unifiedProduct.sourceToQuickBooksFactor,
			quickBooksConversionAdjustmentPercent: unifiedProduct.quickBooksConversionAdjustmentPercent,
			localInventory: unifiedProduct.localInventory,
			onlinePriceCents: unifiedProduct.onlinePriceCents,
			guildCostCents: unifiedProduct.guildCostCents,
			sprCostCents: unifiedProduct.sprCostCents,
			qbId: qb.qbId,
			qbAccount: qb.account,
			qbProductName: qb.productName,
			qbDescription: qb.desc,
			qbUpc: qb.upc,
			qbCostCents: qb.costCents,
			quickBooksUm: qb.um,
			preferredVendor: qb.preferredVendor,
			guildPriceCents: unifiedGuild.priceCents,
			guildUm: unifiedGuild.um,
			sprNetPriceCents: unifiedSpr.netPriceCents,
			sprDealerNetPriceCents: unifiedSpr.dealerNetPriceCents,
			sprUm: unifiedSpr.um,
			shopifyPriceCents: shopify.vPriceCents,
			customOnlineType: onlineSetting.confType,
			customOnlineValue: onlineSetting.value,
			customQbType: qbSetting.confType,
			customQbValue: qbSetting.value,
			conversionFactorSettingId: conversionFactorSetting.id,
			conversionAdjustmentSettingId: conversionAdjustmentSetting.id
		})
		.from(priceChanges)
		.innerJoin(unifiedProduct, eq(unifiedProduct.id, priceChanges.productRow))
		.innerJoin(uniref, eq(uniref.unifiedProduct, unifiedProduct.id))
		.innerJoin(qb, eq(qb.id, unifiedProduct.qbRow))
		.leftJoin(unifiedGuild, eq(unifiedGuild.id, unifiedProduct.unifiedGuildRow))
		.leftJoin(unifiedSpr, eq(unifiedSpr.id, unifiedProduct.unifiedSprRow))
		.leftJoin(shopify, eq(shopify.id, unifiedProduct.shopifyRow))
		.leftJoin(
			onlineSetting,
			and(
				eq(onlineSetting.refId, unifiedProduct.id),
				eq(onlineSetting.col, 'onlinePriceCents'),
				inArray(onlineSetting.confType, customSettingTypes)
			)
		)
		.leftJoin(
			qbSetting,
			and(
				eq(qbSetting.refId, unifiedProduct.id),
				eq(qbSetting.col, 'targetQuickBooksPriceCents'),
				inArray(qbSetting.confType, customSettingTypes)
			)
		)
		.leftJoin(
			conversionFactorSetting,
			and(
				eq(conversionFactorSetting.refId, unifiedProduct.id),
				eq(conversionFactorSetting.col, 'sourceToQuickBooksFactor'),
				eq(conversionFactorSetting.confType, 'setting:custom')
			)
		)
		.leftJoin(
			conversionAdjustmentSetting,
			and(
				eq(conversionAdjustmentSetting.refId, unifiedProduct.id),
				eq(conversionAdjustmentSetting.col, 'quickBooksConversionAdjustmentPercent'),
				eq(conversionAdjustmentSetting.confType, 'setting:custom')
			)
		);

type RawChangeRow = Awaited<ReturnType<ReturnType<typeof listQuery>['execute']>>[number];

function toChangeItem(row: RawChangeRow, awaitingCustomApproval: boolean) {
	const sourceUm = (row.source === 'guild' ? row.guildUm : row.sprUm) ?? row.um;
	const conversionSuggestion = suggestQuickBooksConversion(
		sourceUm,
		row.quickBooksUm,
		row.qtyPerUm
	);

	return {
		id: row.id,
		productRow: row.productRow,
		uniId: row.uniId,
		status: row.status,
		currentPriceCents: row.currentPriceCents,
		targetPriceCents: row.targetPriceCents,
		changePercent: row.changePercentMilli / 1000,
		inFlyer: row.inFlyer,
		source: row.source,
		decidedAt: row.decidedAt,
		decidedBy: row.decidedBy,
		exportRow: row.exportRow,
		exportedAt: row.exportedAt,
		title: row.title,
		gid: row.gid,
		sprc: row.sprc,
		upc: row.upc ?? row.qbUpc,
		primaryImage: row.primaryImage,
		primaryImageDescription: row.primaryImageDescription,
		um: row.um,
		qtyPerUm: row.qtyPerUm,
		sourceUm,
		quickBooksUm: row.quickBooksUm,
		sourceToQuickBooksFactor: row.sourceToQuickBooksFactor,
		quickBooksConversionAdjustmentPercent: row.quickBooksConversionAdjustmentPercent,
		unitConversionConfigured:
			row.conversionFactorSettingId !== null || row.conversionAdjustmentSettingId !== null,
		conversionSuggestion,
		localInventory: row.localInventory,
		onlinePriceCents: row.onlinePriceCents,
		qbId: row.qbId,
		qbAccount: row.qbAccount,
		qbProductName: row.qbProductName,
		qbDescription: row.qbDescription,
		preferredVendor: row.preferredVendor,
		guildPriceCents: row.guildPriceCents,
		guildUm: row.guildUm,
		novexcoPriceCents: sprSellPriceCents(row.sprNetPriceCents, row.sprDealerNetPriceCents),
		sprUm: row.sprUm,
		shopifyPriceCents: row.shopifyPriceCents,
		guildCostCents: row.guildCostCents,
		novexcoCostCents: row.sprCostCents,
		quickBooksCostCents: row.qbCostCents,
		customOnline: row.customOnlineType
			? {
					confType: row.customOnlineType,
					priceCents: row.customOnlineValue === null ? null : Number(row.customOnlineValue)
				}
			: null,
		customQuickBooks: row.customQbType
			? {
					confType: row.customQbType,
					priceCents: row.customQbValue === null ? null : Number(row.customQbValue)
				}
			: null,
		awaitingCustomApproval
	};
}

export type PriceChangeItem = ReturnType<typeof toChangeItem>;

/** Products whose custom price is waiting on a decision because the auto value moved. */
async function loadCustomApprovals() {
	const rows = await db
		.select({
			errorId: unifiedProductCellConfig.id,
			productRow: unifiedProductCellConfig.refId,
			col: unifiedProductCellConfig.col,
			customPriceCents: unifiedProductCellConfig.value,
			autoPriceCents: unifiedProductCellConfig.lastValue,
			created: unifiedProductCellConfig.created,
			uniId: uniref.uniId,
			title: unifiedProduct.title,
			gid: unifiedProduct.gid,
			sprc: unifiedProduct.sprc,
			upc: unifiedProduct.upc,
			primaryImage: unifiedProduct.primaryImage,
			primaryImageDescription: unifiedProduct.primaryImageDescription,
			qbProductName: qb.productName,
			qbDescription: qb.desc,
			onlinePriceCents: unifiedProduct.onlinePriceCents,
			targetQuickBooksPriceCents: unifiedProduct.targetQuickBooksPriceCents
		})
		.from(unifiedProductCellConfig)
		.innerJoin(unifiedProduct, eq(unifiedProduct.id, unifiedProductCellConfig.refId))
		.innerJoin(uniref, eq(uniref.unifiedProduct, unifiedProduct.id))
		.leftJoin(qb, eq(qb.id, unifiedProduct.qbRow))
		.where(
			and(
				eq(unifiedProductCellConfig.confType, 'error:needsApprovalCustom'),
				eq(unifiedProductCellConfig.resolved, false),
				inArray(unifiedProductCellConfig.col, [...CUSTOM_PRICE_COLUMNS]),
				eq(unifiedProduct.deleted, false)
			)
		)
		.orderBy(desc(unifiedProductCellConfig.created))
		.limit(LIST_LIMIT);

	return rows.map((row) => ({
		...row,
		col: row.col as CustomPriceColumn,
		compoundId: `unifiedProduct:${row.productRow}`,
		customPriceCents: row.customPriceCents === null ? null : Number(row.customPriceCents),
		autoPriceCents: row.autoPriceCents === null ? null : Number(row.autoPriceCents)
	}));
}

async function loadPriceChanges(category: PriceChangeCategory) {
	const scope = categoryFilter(category);
	const [lastExport] = await db
		.select({ createdAt: priceChangeExports.createdAt })
		.from(priceChangeExports)
		.where(eq(priceChangeExports.category, category))
		.orderBy(desc(priceChangeExports.createdAt))
		.limit(1);
	const lastExportAt = lastExport?.createdAt ?? 0;
	const [counts, customApprovals, scopeCounts] = await Promise.all([
		db
			.select({
				pending: sql<number>`count(*) filter (where ${priceChanges.status} = 'pending')`,
				approved: sql<number>`count(*) filter (where ${priceChanges.status} = 'approved')`,
				rejected: sql<number>`count(*) filter (where ${priceChanges.status} = 'rejected')`,
				exported: sql<number>`count(*) filter (where ${priceChanges.status} = 'exported')`,
				approvedSinceLastExport: sql<number>`count(*) filter (where ${priceChanges.status} = 'approved' and ${priceChanges.decidedAt} > ${lastExportAt})`,
				rejectedSinceLastExport: sql<number>`count(*) filter (where ${priceChanges.status} = 'rejected' and ${priceChanges.decidedAt} > ${lastExportAt})`,
				computedAt: sql<number>`coalesce(max(${priceChanges.computedAt}), 0)`
			})
			.from(priceChanges)
			.where(scope)
			.then((rows) => rows[0]),
		loadCustomApprovals(),
		db
			.select({
				flyer: sql<number>`count(*) filter (where ${priceChanges.status} = 'pending' and ${priceChanges.inFlyer} = true)`,
				guild: sql<number>`count(*) filter (where ${priceChanges.status} = 'pending' and ${priceChanges.inFlyer} = false and ${priceChanges.source} = 'guild')`,
				spr: sql<number>`count(*) filter (where ${priceChanges.status} = 'pending' and ${priceChanges.inFlyer} = false and ${priceChanges.source} = 'spr')`,
				all: sql<number>`count(*) filter (where ${priceChanges.status} = 'pending' and ${priceChanges.inFlyer} = false)`
			})
			.from(priceChanges)
			.then((rows) => rows[0])
	]);

	const awaiting = new Set(customApprovals.map((row) => row.productRow));
	const load = async (status: 'pending' | 'approved' | 'rejected' | 'exported', order: SQL) =>
		(
			await listQuery()
				.where(and(eq(priceChanges.status, status), scope))
				.orderBy(order)
				.limit(LIST_LIMIT)
		).map((row) => toChangeItem(row, awaiting.has(row.productRow)));

	// Biggest movers first: the changes most worth a person's attention, and the ones bulk
	// approving small changes will never reach.
	const bySize = desc(sql`abs(${priceChanges.changePercentMilli})`);
	const [pending, approved, rejected, exported] = await Promise.all([
		load('pending', bySize),
		load('approved', desc(priceChanges.decidedAt)),
		load('rejected', desc(priceChanges.decidedAt)),
		load('exported', desc(priceChanges.exportedAt))
	]);

	return {
		category,
		summary: {
			pending: Number(counts?.pending ?? 0),
			approved: Number(counts?.approved ?? 0),
			rejected: Number(counts?.rejected ?? 0),
			exported: Number(counts?.exported ?? 0),
			approvedSinceLastExport: Number(counts?.approvedSinceLastExport ?? 0),
			rejectedSinceLastExport: Number(counts?.rejectedSinceLastExport ?? 0),
			lastExportAt,
			scopeCounts: {
				flyer: Number(scopeCounts?.flyer ?? 0),
				guild: Number(scopeCounts?.guild ?? 0),
				spr: Number(scopeCounts?.spr ?? 0),
				all: Number(scopeCounts?.all ?? 0)
			},
			customApprovals: customApprovals.length,
			computedAt: Number(counts?.computedAt ?? 0),
			listLimit: LIST_LIMIT
		},
		pending,
		approved,
		rejected,
		exported,
		customApprovals
	};
}

async function loadExports() {
	const rows = await db
		.select({
			id: priceChangeExports.id,
			name: priceChangeExports.name,
			category: priceChangeExports.category,
			itemCount: priceChangeExports.itemCount,
			createdAt: priceChangeExports.createdAt,
			createdBy: priceChangeExports.createdBy
		})
		.from(priceChangeExports)
		.orderBy(desc(priceChangeExports.createdAt))
		.limit(100);
	return rows;
}

async function loadExportItems(exportId: number) {
	const [exportRow] = await db
		.select()
		.from(priceChangeExports)
		.where(eq(priceChangeExports.id, exportId));
	if (!exportRow) throw new TRPCError({ code: 'NOT_FOUND', message: 'Export not found' });
	const items = await db
		.select()
		.from(priceChangeExportItems)
		.where(eq(priceChangeExportItems.exportRow, exportId))
		.orderBy(asc(priceChangeExportItems.barcode));
	return { exportRow, items };
}

type ExportedItem = Pick<
	typeof priceChangeExportItems.$inferInsert,
	'title' | 'productName' | 'barcode' | 'newPriceCents' | 'qbId'
>;

function sheetLabelValues(sheetId: number, items: ExportedItem[]): (typeof labels.$inferInsert)[] {
	return items.map((item) => ({
		sheet: sheetId,
		name: (item.title ?? item.productName ?? '').slice(0, 256),
		barcode: (item.barcode ?? '').slice(0, 256),
		priceCents: item.newPriceCents,
		qbId: item.qbId.slice(0, 256)
	}));
}

async function insertChunked<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
	for (let start = 0; start < rows.length; start += 500) {
		await insert(rows.slice(start, start + 500));
	}
}

function exportFileName(name: string, revert: boolean) {
	const date = new Date().toISOString().slice(0, 10);
	return `${name} (qb-${revert ? 'revert-' : ''}${date}).csv`;
}

/** The queue columns every reconciliation refreshes, shared by the upserts below. */
const reconciledValueColumns = {
	status: sql`excluded.status`,
	currentPriceCents: sql`excluded.current_price_cents`,
	targetPriceCents: sql`excluded.target_price_cents`,
	changePercentMilli: sql`excluded.change_percent_milli`,
	inFlyer: sql`excluded.in_flyer`,
	source: sql`excluded.source`,
	computedAt: sql`excluded.computed_at`
};

/** Re-queued rows drop the decision they were made against, exactly like the worker's pass. */
const requeuedValueColumns = {
	...reconciledValueColumns,
	approvedPriceCents: null,
	rejectedPriceCents: null,
	decidedAt: null,
	decidedBy: null,
	exportRow: null,
	exportedAt: null
};

/**
 * Resolve one product's queue row now, with the same rules the worker applies to the whole
 * table. A settings edit (custom price, U/M conversion) has already recomputed the product's
 * target, so the review sub can push final data instead of values the worker cascade would only
 * correct seconds later. The worker still runs afterwards and repeats this as a no-op.
 */
async function reconcileSinglePriceChange(productRow: number) {
	const [row] = await db
		.select({
			targetPriceCents: unifiedProduct.targetQuickBooksPriceCents,
			currentPriceCents: qb.priceCents,
			inFlyer: unifiedProduct.inFlyer,
			guildPriceCents: unifiedGuild.priceCents,
			sprPriceCents: unifiedSpr.netPriceCents
		})
		.from(unifiedProduct)
		.innerJoin(qb, eq(qb.id, unifiedProduct.qbRow))
		.leftJoin(unifiedGuild, eq(unifiedGuild.id, unifiedProduct.unifiedGuildRow))
		.leftJoin(unifiedSpr, eq(unifiedSpr.id, unifiedProduct.unifiedSprRow))
		.where(
			and(
				eq(unifiedProduct.id, productRow),
				eq(unifiedProduct.deleted, false),
				// The same candidate rules as the worker: a valid nonnegative target that
				// differs from the channel price. Anything else deletes the row.
				isNotNull(unifiedProduct.targetQuickBooksPriceCents),
				gte(unifiedProduct.targetQuickBooksPriceCents, 0),
				gte(qb.priceCents, 0),
				ne(unifiedProduct.targetQuickBooksPriceCents, qb.priceCents)
			)
		);

	const candidate: PriceChangeCandidate | undefined =
		row && row.targetPriceCents !== null
			? {
					productRow,
					currentPriceCents: row.currentPriceCents,
					targetPriceCents: row.targetPriceCents,
					inFlyer: row.inFlyer ?? false,
					source:
						row.guildPriceCents !== null ? 'guild' : row.sprPriceCents !== null ? 'spr' : 'other'
				}
			: undefined;

	await db.transaction(async (tx) => {
		const [stored] = await tx
			.select({
				id: priceChanges.id,
				productRow: priceChanges.productRow,
				status: priceChanges.status,
				approvedPriceCents: priceChanges.approvedPriceCents,
				rejectedPriceCents: priceChanges.rejectedPriceCents
			})
			.from(priceChanges)
			.where(and(eq(priceChanges.productRow, productRow), eq(priceChanges.channel, 'quickBooks')))
			.for('update');

		const { keep, requeue, deleteIds } = reconcilePriceChanges(
			candidate ? [candidate] : [],
			stored ? [stored] : [],
			Date.now()
		);

		if (keep.length > 0)
			await tx
				.insert(priceChanges)
				.values(keep)
				.onConflictDoUpdate({
					target: [priceChanges.productRow, priceChanges.channel],
					set: reconciledValueColumns
				});
		if (requeue.length > 0)
			await tx
				.insert(priceChanges)
				.values(requeue)
				.onConflictDoUpdate({
					target: [priceChanges.productRow, priceChanges.channel],
					set: requeuedValueColumns
				});
		for (const id of deleteIds) {
			await tx.delete(priceChanges).where(eq(priceChanges.id, id));
		}
	});
}

async function setCustomPriceSetting({
	productRow,
	col,
	priceCents,
	approveOnUnderlyingChange
}: {
	productRow: number;
	col: CustomPriceColumn;
	priceCents: number | null;
	approveOnUnderlyingChange: boolean;
}) {
	const [product] = await db
		.select({
			onlinePriceCents: unifiedProduct.onlinePriceCents,
			targetQuickBooksPriceCents: unifiedProduct.targetQuickBooksPriceCents,
			guildPriceCents: unifiedGuild.priceCents,
			sprNetPriceCents: unifiedSpr.netPriceCents,
			sprDealerNetPriceCents: unifiedSpr.dealerNetPriceCents,
			shopifyPriceCents: shopify.vPriceCents
		})
		.from(unifiedProduct)
		.leftJoin(unifiedGuild, eq(unifiedGuild.id, unifiedProduct.unifiedGuildRow))
		.leftJoin(unifiedSpr, eq(unifiedSpr.id, unifiedProduct.unifiedSprRow))
		.leftJoin(shopify, eq(shopify.id, unifiedProduct.shopifyRow))
		.where(eq(unifiedProduct.id, productRow));
	if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Unified product not found' });

	const underlyingOnlinePriceCents =
		product.guildPriceCents ??
		sprSellPriceCents(product.sprNetPriceCents, product.sprDealerNetPriceCents) ??
		product.shopifyPriceCents ??
		product.onlinePriceCents;
	const underlyingPriceCents =
		col === 'onlinePriceCents' ? underlyingOnlinePriceCents : product.onlinePriceCents;

	const { updateSetting } = await getCellConfigHelper(
		`unifiedProduct:${productRow}`,
		col,
		db,
		unifiedOnUpdateCallback
	);

	await updateSetting(
		priceCents === null
			? null
			: {
					refId: productRow,
					col,
					confType: approveOnUnderlyingChange ? 'setting:approveCustom' : 'setting:custom',
					value: priceCents.toString(),
					// Track the automatic value, not the currently stored cell. The stored cell may
					// already be custom when someone edits an existing override.
					lastValue: approveOnUnderlyingChange ? (underlyingPriceCents?.toString() ?? null) : null,
					created: Date.now(),
					isDefaultSetting: false
				}
	);

	// The settings write already recomputed the target, so the queue row can be resolved
	// immediately and the review push carries final data.
	await reconcileSinglePriceChange(productRow);
	if (col === 'onlinePriceCents') notifyPriceListUpdated();
	updatePriceChanges();
}

async function setUnitConversionSettings({
	productRow,
	factor,
	adjustmentPercent
}: {
	productRow: number;
	factor: number | null;
	adjustmentPercent: number | null;
}) {
	const [product] = await db
		.select({ id: unifiedProduct.id })
		.from(unifiedProduct)
		.where(eq(unifiedProduct.id, productRow));
	if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Unified product not found' });

	const { updateSettings } = await getCellConfigHelper(
		`unifiedProduct:${productRow}`,
		CONVERSION_COLUMNS[0],
		db,
		unifiedOnUpdateCallback
	);
	const created = Date.now();
	const values = [factor, adjustmentPercent] as const;
	await updateSettings(
		CONVERSION_COLUMNS.map((col, index) => ({
			col,
			settingData:
				values[index] === null
					? null
					: {
							refId: productRow,
							col,
							confType: 'setting:custom' as const,
							value: values[index].toString(),
							lastValue: null,
							created,
							isDefaultSetting: false
						}
		}))
	);
	// The settings write already recomputed the target, so the queue row can be resolved
	// immediately and the review push carries final data.
	await reconcileSinglePriceChange(productRow);
	updatePriceChanges();
}

/** Every pending change in the category whose move fits inside the reviewer's limits. */
function bulkApproveFilter(
	category: PriceChangeCategory,
	maxIncreasePercent: number,
	maxDecreasePercent: number
) {
	return and(
		eq(priceChanges.status, 'pending'),
		categoryFilter(category),
		lte(priceChanges.changePercentMilli, Math.round(maxIncreasePercent * 1000)),
		gte(priceChanges.changePercentMilli, -Math.round(maxDecreasePercent * 1000))
	);
}

/** The headline number for the home page tile: changes still awaiting a decision. */
async function loadPendingCount() {
	const [row] = await db
		.select({ count: sql<number>`count(*)` })
		.from(priceChanges)
		.where(eq(priceChanges.status, 'pending'));
	return { pending: Number(row?.count ?? 0) };
}

export const priceChangesRouter = router({
	worker,
	pendingCount: viewerProcedure.query(loadPendingCount),
	pendingCountSub: createSub(loadPendingCount),
	get: viewerProcedure
		.input(z.object({ category: categoryInput }))
		.query(({ input: { category } }) => loadPriceChanges(category)),
	getSub: createSub<
		{ category: PriceChangeCategory },
		Awaited<ReturnType<typeof loadPriceChanges>>
	>(async ({ input }) => loadPriceChanges(input?.category ?? 'all')),
	reviewState: viewerProcedure
		.input(
			z.object({
				ids: z.array(z.number().int().positive()).min(1).max(LIST_LIMIT),
				category: categoryInput
			})
		)
		.query(async ({ input: { ids, category } }) => {
			return await db
				.select({
					id: priceChanges.id,
					status: priceChanges.status,
					currentPriceCents: priceChanges.currentPriceCents,
					targetPriceCents: priceChanges.targetPriceCents,
					changePercentMilli: priceChanges.changePercentMilli,
					inFlyer: priceChanges.inFlyer,
					source: priceChanges.source,
					decidedAt: priceChanges.decidedAt,
					decidedBy: priceChanges.decidedBy,
					exportRow: priceChanges.exportRow,
					exportedAt: priceChanges.exportedAt
				})
				.from(priceChanges)
				.where(and(inArray(priceChanges.id, [...new Set(ids)]), categoryFilter(category)));
		}),

	decide: generalProcedure
		.input(
			z.object({
				ids: z.array(z.number().int().positive()).min(1),
				decision: z.enum(['approve', 'reject', 'reset']),
				expectedStatus: z.enum(['pending', 'approved', 'rejected']),
				expectedTargetPriceCents: z.number().int().gte(0).optional(),
				expectedDecidedAt: z.number().int().nullable().optional()
			})
		)
		.mutation(async ({ ctx, input }) => {
			const { decision, expectedStatus, expectedTargetPriceCents, expectedDecidedAt } = input;
			const ids = [...new Set(input.ids)];
			const now = Date.now();
			const decided = await db.transaction(async (tx) => {
				const current = await tx
					.select({
						id: priceChanges.id,
						status: priceChanges.status,
						targetPriceCents: priceChanges.targetPriceCents,
						decidedAt: priceChanges.decidedAt
					})
					.from(priceChanges)
					.where(inArray(priceChanges.id, ids))
					.orderBy(priceChanges.id)
					.for('update');
				const changed =
					current.length !== ids.length ||
					current.some(
						(row) =>
							row.status !== expectedStatus ||
							(expectedTargetPriceCents !== undefined &&
								row.targetPriceCents !== expectedTargetPriceCents) ||
							(expectedDecidedAt !== undefined && row.decidedAt !== expectedDecidedAt)
					);
				if (changed) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'A selected price change was updated. Refresh and try again.'
					});
				}

				return await tx
					.update(priceChanges)
					.set(
						decision === 'approve'
							? {
									status: 'approved',
									approvedPriceCents: sql`${priceChanges.targetPriceCents}`,
									rejectedPriceCents: null,
									decidedAt: now,
									decidedBy: ctx.user.username,
									exportRow: null,
									exportedAt: null
								}
							: decision === 'reject'
								? {
										status: 'rejected',
										rejectedPriceCents: sql`${priceChanges.targetPriceCents}`,
										approvedPriceCents: null,
										decidedAt: now,
										decidedBy: ctx.user.username,
										exportRow: null,
										exportedAt: null
									}
								: {
										status: 'pending',
										approvedPriceCents: null,
										rejectedPriceCents: null,
										decidedAt: null,
										decidedBy: null,
										exportRow: null,
										exportedAt: null
									}
					)
					.where(inArray(priceChanges.id, ids))
					.returning({
						id: priceChanges.id,
						status: priceChanges.status,
						targetPriceCents: priceChanges.targetPriceCents,
						decidedAt: priceChanges.decidedAt,
						decidedBy: priceChanges.decidedBy
					});
			});
			updatePriceChanges();
			return { count: decided.length, changes: decided };
		}),

	bulkCount: viewerProcedure
		.input(
			z.object({
				category: categoryInput,
				maxIncreasePercent: z.coerce.number().min(0).max(1000),
				maxDecreasePercent: z.coerce.number().min(0).max(1000)
			})
		)
		.query(async ({ input: { category, maxIncreasePercent, maxDecreasePercent } }) => {
			const [row] = await db
				.select({ count: sql<number>`count(*)` })
				.from(priceChanges)
				.where(bulkApproveFilter(category, maxIncreasePercent, maxDecreasePercent));
			return { count: Number(row?.count ?? 0) };
		}),

	bulkApprove: generalProcedure
		.input(
			z.object({
				category: categoryInput,
				maxIncreasePercent: z.coerce.number().min(0).max(1000),
				maxDecreasePercent: z.coerce.number().min(0).max(1000)
			})
		)
		.mutation(async ({ ctx, input: { category, maxIncreasePercent, maxDecreasePercent } }) => {
			const decidedAt = Date.now();
			const approved = await db.transaction(async (tx) => {
				const locked = await tx
					.select({ id: priceChanges.id })
					.from(priceChanges)
					.where(bulkApproveFilter(category, maxIncreasePercent, maxDecreasePercent))
					.orderBy(priceChanges.id)
					.for('update');
				const result: { id: number }[] = [];
				for (let start = 0; start < locked.length; start += 500) {
					result.push(
						...(await tx
							.update(priceChanges)
							.set({
								status: 'approved',
								approvedPriceCents: sql`${priceChanges.targetPriceCents}`,
								rejectedPriceCents: null,
								decidedAt,
								decidedBy: ctx.user.username,
								exportRow: null,
								exportedAt: null
							})
							.where(
								inArray(
									priceChanges.id,
									locked.slice(start, start + 500).map((row) => row.id)
								)
							)
							.returning({ id: priceChanges.id }))
					);
				}
				return result;
			});
			updatePriceChanges();
			return { count: approved.length, ids: approved.map(({ id }) => id), decidedAt };
		}),

	setCustomPrice: generalProcedure
		.input(
			z.object({
				productRow: z.number().int().positive(),
				target: z.enum(['online', 'quickBooks']),
				price: z.coerce.number().finite().gte(0),
				approveOnUnderlyingChange: z.boolean().default(false)
			})
		)
		.mutation(async ({ input: { productRow, target, price, approveOnUnderlyingChange } }) => {
			await setCustomPriceSetting({
				productRow,
				col: target === 'online' ? 'onlinePriceCents' : 'targetQuickBooksPriceCents',
				priceCents: Math.round(price * 100),
				approveOnUnderlyingChange
			});
		}),

	clearCustomPrice: generalProcedure
		.input(
			z.object({
				productRow: z.number().int().positive(),
				target: z.enum(['online', 'quickBooks'])
			})
		)
		.mutation(async ({ input: { productRow, target } }) => {
			await setCustomPriceSetting({
				productRow,
				col: target === 'online' ? 'onlinePriceCents' : 'targetQuickBooksPriceCents',
				priceCents: null,
				approveOnUnderlyingChange: false
			});
		}),

	setUnitConversion: generalProcedure
		.input(
			z.object({
				productRow: z.number().int().positive(),
				factor: z.coerce.number().finite().gt(0).max(1_000_000),
				adjustmentPercent: z.coerce.number().finite().gt(-100).max(100_000)
			})
		)
		.mutation(async ({ input: { productRow, factor, adjustmentPercent } }) => {
			await setUnitConversionSettings({ productRow, factor, adjustmentPercent });
		}),

	resetUnitConversion: generalProcedure
		.input(z.object({ productRow: z.number().int().positive() }))
		.mutation(async ({ input: { productRow } }) => {
			await setUnitConversionSettings({
				productRow,
				factor: null,
				adjustmentPercent: null
			});
		}),

	exportApproved: generalProcedure
		.input(
			z.object({
				category: categoryInput,
				ids: z.array(z.number().int().positive()).min(1).optional(),
				name: z.string().trim().min(1).max(128).optional()
			})
		)
		.mutation(async ({ ctx, input: { category, ids, name } }) => {
			const now = Date.now();
			const categoryLabel = { flyer: 'Flyer', guild: 'Guild', spr: 'SPR', all: 'All' }[category];
			const sheetName = (
				name ?? `Price Changes ${new Date(now).toISOString().slice(0, 10)} (${categoryLabel})`
			).slice(0, 128);

			const result = await db.transaction(async (tx) => {
				const requestedIds = ids ? [...new Set(ids)] : undefined;
				if (ids && requestedIds!.length !== ids.length) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'A price change was selected more than once'
					});
				}
				const locked = await tx
					.select({ id: priceChanges.id })
					.from(priceChanges)
					.where(
						and(
							eq(priceChanges.status, 'approved'),
							categoryFilter(category),
							requestedIds ? inArray(priceChanges.id, requestedIds) : undefined
						)
					)
					.orderBy(priceChanges.id)
					.for('update');
				if (locked.length === 0) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'No approved price changes to export'
					});
				}
				if (requestedIds && locked.length !== requestedIds.length) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'A selected price change was updated. Refresh and try again.'
					});
				}
				const rows = await listQuery(tx)
					.where(
						inArray(
							priceChanges.id,
							locked.map((row) => row.id)
						)
					)
					.orderBy(asc(unifiedProduct.upc), asc(qb.productName));
				if (rows.length !== locked.length) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'An approved price change no longer has complete product data.'
					});
				}

				const [exportRow] = await tx
					.insert(priceChangeExports)
					.values({
						name: sheetName,
						category,
						itemCount: rows.length,
						createdAt: now,
						createdBy: ctx.user.username
					})
					.returning({ id: priceChangeExports.id });

				const [sheet] = await tx
					.insert(labelSheets)
					.values({
						name: sheetName,
						public: true,
						owner: ctx.user.username,
						priceChangeExport: exportRow.id
					})
					.returning({ id: labelSheets.id });

				const items = rows.map((row) => ({
					exportRow: exportRow.id,
					productRow: row.productRow,
					qbId: row.qbId.slice(0, 256),
					qbAccount: row.qbAccount?.slice(0, 256) ?? null,
					productName: row.qbProductName?.slice(0, 256) ?? null,
					// The shelf tag has to scan, so fall back the way the old export did: a UPC if
					// we have one, otherwise the QuickBooks item name.
					barcode: (row.upc ?? row.qbUpc ?? row.qbProductName ?? '').slice(0, 256),
					title: row.title,
					preferredVendor: row.preferredVendor?.slice(0, 256) ?? null,
					previousPriceCents: row.currentPriceCents,
					newPriceCents: row.targetPriceCents
				}));
				await insertChunked(items, (chunk) => tx.insert(priceChangeExportItems).values(chunk));
				await insertChunked(sheetLabelValues(sheet.id, items), (chunk) =>
					tx.insert(labels).values(chunk)
				);

				let markedExported = 0;
				await insertChunked(
					rows.map((row) => row.id),
					async (chunk) => {
						const marked = await tx
							.update(priceChanges)
							.set({ status: 'exported', exportRow: exportRow.id, exportedAt: now })
							// A second reviewer may have exported or changed one of these rows after
							// the list was loaded. Claim only rows that are still approved so two
							// concurrent exports cannot contain the same price change.
							.where(and(inArray(priceChanges.id, chunk), eq(priceChanges.status, 'approved')))
							.returning({ id: priceChanges.id });
						markedExported += marked.length;
					}
				);
				if (markedExported !== rows.length) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'Some price changes were updated by another reviewer. Refresh and try again.'
					});
				}

				return { exportId: exportRow.id, sheetId: sheet.id, count: rows.length };
			});

			updatePriceChanges();
			notifyLabelsUpdated();
			return result;
		}),

	exports: {
		list: viewerProcedure.query(loadExports),
		listSub: createSub(loadExports),
		get: viewerProcedure
			.input(z.object({ exportId: z.number().int().positive() }))
			.query(async ({ input: { exportId } }) => {
				const { exportRow, items } = await loadExportItems(exportId);
				return { ...exportRow, items };
			}),
		csv: viewerProcedure
			.input(
				z.object({
					exportId: z.number().int().positive(),
					mode: z.enum(['change', 'revert'])
				})
			)
			.query(async ({ input: { exportId, mode } }) => {
				const { exportRow, items } = await loadExportItems(exportId);
				const revert = mode === 'revert';
				return {
					fileName: exportFileName(exportRow.name, revert),
					csv: buildQuickBooksPriceCsv(items, { revert })
				};
			}),
		toSheet: generalProcedure
			.input(
				z.object({
					exportId: z.number().int().positive(),
					name: z.string().trim().min(1).max(128).optional()
				})
			)
			.mutation(async ({ ctx, input: { exportId, name } }) => {
				const { exportRow, items } = await loadExportItems(exportId);
				if (items.length === 0) {
					throw new TRPCError({ code: 'BAD_REQUEST', message: 'This export has no items' });
				}
				const sheetId = await db.transaction(async (tx) => {
					const [sheet] = await tx
						.insert(labelSheets)
						.values({
							name: (name ?? exportRow.name).slice(0, 128),
							public: true,
							owner: ctx.user.username,
							priceChangeExport: exportRow.id
						})
						.returning({ id: labelSheets.id });
					await insertChunked(sheetLabelValues(sheet.id, items), (chunk) =>
						tx.insert(labels).values(chunk)
					);
					return sheet.id;
				});
				notifyLabelsUpdated();
				return { sheetId };
			})
	}
});
