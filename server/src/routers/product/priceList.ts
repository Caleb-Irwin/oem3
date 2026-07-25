import { TRPCError } from '@trpc/server';
import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import {
	qb,
	shopify,
	unifiedGuild,
	unifiedProduct,
	unifiedProductCellConfig,
	unifiedSpr,
	uniref
} from '../../db.schema';
import { db } from '../../db';
import { getCellConfigHelper } from '../../unified/cellConfigHelper';
import { eventSubscription } from '../../utils/eventSubscription';
import { generalProcedure, router, viewerProcedure } from '../../trpc';
import { unifiedOnUpdateCallback } from '../unified.helpers';

const customSettingTypes = ['setting:custom', 'setting:approveCustom'] as const;
const { update: updatePriceList, createSub } = eventSubscription();

const basePriceListQuery = () =>
	db
		.select({
			id: unifiedProduct.id,
			uniId: uniref.uniId,
			title: unifiedProduct.title,
			gid: unifiedProduct.gid,
			sprc: unifiedProduct.sprc,
			upc: unifiedProduct.upc,
			deleted: unifiedProduct.deleted,
			um: unifiedProduct.um,
			qtyPerUm: unifiedProduct.qtyPerUm,
			primaryImage: unifiedProduct.primaryImage,
			primaryImageDescription: unifiedProduct.primaryImageDescription,
			currentPriceCents: unifiedProduct.onlinePriceCents,
			guildCostCents: unifiedProduct.guildCostCents,
			novexcoCostCents: unifiedProduct.sprCostCents,
			customSettingId: unifiedProductCellConfig.id,
			customPrice: unifiedProductCellConfig.value,
			guildPriceCents: unifiedGuild.priceCents,
			sprNetPriceCents: unifiedSpr.netPriceCents,
			sprDealerNetPriceCents: unifiedSpr.dealerNetPriceCents,
			shopifyPriceCents: shopify.vPriceCents,
			quickBooksPriceCents: qb.priceCents,
			quickBooksCostCents: qb.costCents
		})
		.from(unifiedProduct)
		.innerJoin(uniref, eq(uniref.unifiedProduct, unifiedProduct.id))
		.leftJoin(unifiedGuild, eq(unifiedProduct.unifiedGuildRow, unifiedGuild.id))
		.leftJoin(unifiedSpr, eq(unifiedProduct.unifiedSprRow, unifiedSpr.id))
		.leftJoin(shopify, eq(unifiedProduct.shopifyRow, shopify.id))
		.leftJoin(qb, eq(unifiedProduct.qbRow, qb.id))
		.leftJoin(
			unifiedProductCellConfig,
			and(
				eq(unifiedProductCellConfig.refId, unifiedProduct.id),
				eq(unifiedProductCellConfig.col, 'onlinePriceCents'),
				inArray(unifiedProductCellConfig.confType, customSettingTypes)
			)
		);

type RawPriceListRow = Awaited<
	ReturnType<ReturnType<typeof basePriceListQuery>['execute']>
>[number];

function roundUpToNearestTenCents(value: number): number {
	return Math.ceil(value / 10) * 10 - 1;
}

function getRecommendedPrice(row: RawPriceListRow): {
	priceCents: number | null;
	source: 'guild' | 'novexco' | 'shopify' | 'current' | null;
} {
	const sprPriceCents =
		row.sprNetPriceCents && row.sprDealerNetPriceCents
			? row.sprNetPriceCents >= 1.8 * row.sprDealerNetPriceCents
				? row.sprNetPriceCents
				: roundUpToNearestTenCents(row.sprDealerNetPriceCents * 1.8)
			: (row.sprNetPriceCents ?? null);

	if (row.guildPriceCents !== null) {
		return { priceCents: row.guildPriceCents, source: 'guild' };
	}
	if (sprPriceCents !== null) {
		return { priceCents: sprPriceCents, source: 'novexco' };
	}
	if (row.shopifyPriceCents !== null) {
		return { priceCents: row.shopifyPriceCents, source: 'shopify' };
	}
	if (row.customSettingId === null && row.currentPriceCents !== null) {
		return { priceCents: row.currentPriceCents, source: 'current' };
	}
	return { priceCents: null, source: null };
}

function parseCustomPriceCents(value: string | null): number | null {
	if (value === null) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function toPriceListItem(row: RawPriceListRow) {
	const recommendedPrice = getRecommendedPrice(row);
	const novexcoPriceCents =
		row.sprNetPriceCents && row.sprDealerNetPriceCents
			? row.sprNetPriceCents >= 1.8 * row.sprDealerNetPriceCents
				? row.sprNetPriceCents
				: roundUpToNearestTenCents(row.sprDealerNetPriceCents * 1.8)
			: (row.sprNetPriceCents ?? null);
	return {
		id: row.id,
		uniId: row.uniId,
		title: row.title,
		gid: row.gid,
		sprc: row.sprc,
		upc: row.upc,
		deleted: row.deleted,
		um: row.um,
		qtyPerUm: row.qtyPerUm,
		primaryImage: row.primaryImage,
		primaryImageDescription: row.primaryImageDescription,
		recommendedPriceCents: recommendedPrice.priceCents,
		recommendedPriceSource: recommendedPrice.source,
		guildPriceCents: row.guildPriceCents,
		novexcoPriceCents,
		customPriceCents: parseCustomPriceCents(row.customPrice),
		quickBooksPriceCents: row.quickBooksPriceCents,
		quickBooksCostCents: row.quickBooksCostCents,
		guildCostCents: row.guildCostCents,
		novexcoCostCents: row.novexcoCostCents,
		hasCustomPrice: row.customSettingId !== null
	};
}

async function getPriceList() {
	const rows = await basePriceListQuery()
		.where(isNotNull(unifiedProductCellConfig.id))
		.orderBy(asc(unifiedProduct.title));
	return rows.map(toPriceListItem);
}

async function getPriceListItem(uniId: number) {
	const [row] = await basePriceListQuery().where(eq(uniref.uniId, uniId)).limit(1);
	if (!row) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: 'Unified product not found'
		});
	}
	return toPriceListItem(row);
}

const itemInput = z.object({ uniId: z.number().int().positive() });

export const priceListRouter = router({
	list: viewerProcedure.query(getPriceList),
	listSub: createSub(async () => getPriceList()),
	item: viewerProcedure.input(itemInput).query(({ input }) => getPriceListItem(input.uniId)),
	set: generalProcedure
		.input(
			itemInput.extend({
				price: z.coerce.number().finite().gte(0)
			})
		)
		.mutation(async ({ input: { uniId, price } }) => {
			const item = await getPriceListItem(uniId);
			const settingData = {
				refId: item.id,
				col: 'onlinePriceCents' as const,
				confType: 'setting:custom' as const,
				value: Math.round(price * 100).toString(),
				lastValue: null,
				created: Date.now(),
				isDefaultSetting: false
			};

			const { updateSetting } = await getCellConfigHelper(
				`unifiedProduct:${item.id}`,
				'onlinePriceCents',
				db,
				unifiedOnUpdateCallback
			);
			await updateSetting(settingData);
			updatePriceList();
		}),
	remove: generalProcedure.input(itemInput).mutation(async ({ input: { uniId } }) => {
		const item = await getPriceListItem(uniId);
		const { updateSetting } = await getCellConfigHelper(
			`unifiedProduct:${item.id}`,
			'onlinePriceCents',
			db,
			unifiedOnUpdateCallback
		);
		await updateSetting(null);
		updatePriceList();
	})
});

export const notifyPriceListUpdated = updatePriceList;
