import { and, eq, not, or } from 'drizzle-orm';
import { db as DB, type Tx } from '../../db';
import { createUnifier } from '../../unified/unifier';
import { cellTransformer } from '../../unified/cellConfigurator';
import {
	unifiedProduct,
	unifiedProductCellConfig,
	unifiedGuild,
	unifiedSpr,
	qb,
	shopify,
	productCategoryEnum,
	productStatusEnum,
	productUmEnum
} from '../../db.schema';

const getRow = async (id: number, db: typeof DB | Tx) => {
	const res = await db.query.unifiedProduct
		.findFirst({
			where: eq(unifiedProduct.id, id),
			with: {
				unifiedGuildRowContent: true,
				unifiedSprRowContent: true,
				qbRowContent: true,
				shopifyRowContent: true,
				uniref: true
			}
		})
		.execute();
	if (res === undefined) throw new Error(`UnifiedProduct#${id} not found`);
	return res;
};

type ProductRowType = Awaited<ReturnType<typeof getRow>>;

export const productUnifier = createUnifier<
	ProductRowType,
	typeof unifiedProduct,
	typeof unifiedProductCellConfig,
	typeof unifiedGuild,
	typeof qb | typeof shopify,
	typeof unifiedSpr
>({
	table: unifiedProduct,
	confTable: unifiedProductCellConfig,
	version: 1,
	getRow,
	transform: (
		item,
		t: typeof cellTransformer<typeof unifiedProduct, keyof (typeof unifiedProduct)['$inferSelect']>
	) => {
		const guild = item.unifiedGuildRowContent;
		const spr = item.unifiedSprRowContent;
		const qbRow = item.qbRowContent;
		const shopifyRow = item.shopifyRowContent;

		// Identifiers matching logic
		const gidPrimary = guild?.gid ?? null;
		const sprcPrimary = guild?.spr ?? null;
		const sprcSecondary = spr?.sprc ?? null;

		const upcGuild = guild?.upc ?? null;
		const upcSpr = spr?.upc ?? null;
		const upcShopify = shopifyRow?.vBarcode ?? null;

		const sprIdGuild = guild?.spr ?? null;
		const sprIdSpr = spr?.sprc ?? null;

		const basicsId = guild?.basics ?? null;
		const cisId = guild?.cis ?? null;
		const etilizeId = spr?.etilizeId ?? null;

		// Status determination
		const statusFromSpr =
			spr?.status === 'Active' ? 'ACTIVE' : spr?.status === 'Discontinued' ? 'DISCONTINUED' : null;
		const statusFromShopify =
			shopifyRow?.status === 'ACTIVE'
				? 'ACTIVE'
				: shopifyRow?.status === 'ARCHIVED'
					? 'DISCONTINUED'
					: 'DISABLED';
		const status =
			statusFromShopify ?? statusFromSpr ?? (guild?.deleted ? 'DISCONTINUED' : 'ACTIVE');

		// Category mapping
		const categoryGuild = guild?.category;
		const categorySpr = spr?.category;
		const category = mapCategory(categoryGuild, categorySpr);

		// Pricing
		const onlinePriceCents = shopifyRow?.vPriceCents ?? guild?.priceCents ?? null;
		const onlineComparePriceCents =
			shopifyRow?.vComparePriceCents ?? guild?.comparePriceCents ?? null;
		const quickBooksPriceCents = qbRow?.priceCents ?? null;
		const guildCostCents = guild?.costCents ?? null;
		const sprCostCents = spr?.dealerNetPriceCents ?? null;

		// Units
		const umGuild = guild?.um;
		const umSpr = spr?.um;
		const umQb = qbRow?.um;
		const um = mapUm(umGuild, umSpr, umQb);
		const qtyPerUm = guild?.qtyPerUm ?? null;

		// Images
		const primaryImage = shopifyRow?.imageUrl ?? guild?.imageUrl ?? spr?.primaryImage ?? null;
		const primaryImageDescription =
			shopifyRow?.imageAltText ??
			guild?.imageDescription ??
			spr?.primaryImageDescription ??
			(item.gid ? `Image of ${item.gid}` : item.sprc ? `Image of ${item.sprc}` : null);

		const otherImagesJsonArr = guild?.otherImageListJSON ?? spr?.otherImagesJsonArr ?? null;

		// Inventory
		const guildInventory = guild?.inventory ?? null;
		const localInventory = shopifyRow?.vInventoryOnHandStore ?? null;
		const sprInventoryAvailability = spr?.status ?? null;

		// Physical properties
		const weightGrams = shopifyRow?.vWeightGrams ?? guild?.weightGrams ?? null;
		const vendor = guild?.vendor ?? null;

		return {
			id: t('id', item.id),
			gid: t('gid', gidPrimary),
			sprc: t('sprc', sprcPrimary ?? sprcSecondary, {
				shouldMatch: {
					primary: 'Guild SPR ID',
					secondary: 'SPR SPRC',
					val: sprcSecondary,
					ignore: sprcPrimary === null || sprcSecondary === null
				}
			}),
			status: t('status', status as any),

			unifiedGuildRow: t('unifiedGuildRow', item.unifiedGuildRow),
			unifiedSprRow: t('unifiedSprRow', item.unifiedSprRow),
			qbRow: t('qbRow', item.qbRow),
			shopifyRow: t('shopifyRow', item.shopifyRow),

			upc: t('upc', upcGuild ?? upcSpr ?? upcShopify, {
				shouldMatch: {
					primary: 'Guild UPC',
					secondary: 'SPR UPC',
					val: upcSpr,
					ignore: upcGuild === null || upcSpr === null
				}
			}),
			spr: t('spr', sprIdGuild ?? sprIdSpr, {
				shouldMatch: {
					primary: 'Guild SPR',
					secondary: 'SPR SPRC',
					val: sprIdSpr,
					ignore: sprIdGuild === null || sprIdSpr === null
				}
			}),
			basics: t('basics', basicsId),
			cis: t('cis', cisId),
			etilizeId: t('etilizeId', etilizeId),

			title: t('title', shopifyRow?.title ?? guild?.title ?? spr?.title ?? null),
			description: t(
				'description',
				shopifyRow?.htmlDescription ?? guild?.description ?? spr?.description ?? null
			),
			category: t('category', category),
			inFlyer: t('inFlyer', guild?.flyerRow !== null),

			onlinePriceCents: t('onlinePriceCents', onlinePriceCents),
			onlineComparePriceCents: t('onlineComparePriceCents', onlineComparePriceCents),
			quickBooksPriceCents: t('quickBooksPriceCents', quickBooksPriceCents),
			guildCostCents: t('guildCostCents', guildCostCents),
			sprCostCents: t('sprCostCents', sprCostCents),

			um: t('um', um),
			qtyPerUm: t('qtyPerUm', qtyPerUm),

			primaryImage: t('primaryImage', primaryImage),
			primaryImageDescription: t('primaryImageDescription', primaryImageDescription),
			otherImagesJsonArr: t('otherImagesJsonArr', otherImagesJsonArr),

			availableForSaleOnline: t(
				'availableForSaleOnline',
				shopifyRow !== null && shopifyRow.status === 'ACTIVE'
			),
			guildInventory: t('guildInventory', guildInventory),
			localInventory: t('localInventory', localInventory),
			sprInventoryAvailability: t('sprInventoryAvailability', sprInventoryAvailability),

			weightGrams: t('weightGrams', weightGrams),
			vendor: t('vendor', vendor),

			deleted: t(
				'deleted',
				guild?.deleted ?? spr?.deleted ?? qbRow?.deleted ?? shopifyRow?.deleted ?? false
			),
			lastUpdated: t('lastUpdated', item.lastUpdated)
		};
	},
	connections: {
		primaryTable: {
			table: unifiedGuild,
			refCol: 'unifiedGuildRow',
			findConnections: async (row, db) => {
				const gid = row.gid;
				const upc = row.unifiedGuildRowContent?.upc ?? null;
				const spr = row.unifiedGuildRowContent?.spr ?? null;

				if (!gid && !upc && !spr) return [];

				const res = await db.query.unifiedGuild.findMany({
					where: and(
						or(
							gid ? eq(unifiedGuild.gid, gid) : undefined,
							upc ? eq(unifiedGuild.upc, upc) : undefined,
							spr ? eq(unifiedGuild.spr, spr) : undefined
						),
						not(unifiedGuild.deleted)
					),
					columns: {
						id: true,
						gid: true
					}
				});

				// Prefer exact GID match
				const exactMatch = res.find((r) => r.gid === gid);
				if (exactMatch) return [exactMatch.id];

				return res.map((r) => r.id);
			},
			newRowTransform: (row, lastUpdated) => {
				return {
					gid: row.gid,
					sprc: row.spr,
					status: row.deleted ? 'DISABLED' : 'ACTIVE',
					unifiedGuildRow: row.id,
					unifiedSprRow: null,
					qbRow: null,
					shopifyRow: null,
					lastUpdated,
					deleted: row.deleted
				} satisfies typeof unifiedProduct.$inferInsert;
			},
			isDeleted: (row) => {
				return row.unifiedGuildRowContent?.deleted ?? true;
			}
		},
		secondaryTable: {
			table: unifiedSpr,
			refCol: 'unifiedSprRow',
			findConnections: async (row, db) => {
				const sprc = row.sprc ?? row.unifiedGuildRowContent?.spr ?? null;
				const upc = row.unifiedGuildRowContent?.upc ?? null;
				const etilizeId = row.unifiedSprRowContent?.etilizeId ?? null;

				if (!sprc && !upc && !etilizeId) return [];

				const res = await db.query.unifiedSpr.findMany({
					where: and(
						or(
							sprc ? eq(unifiedSpr.sprc, sprc) : undefined,
							upc ? eq(unifiedSpr.upc, upc) : undefined,
							etilizeId ? eq(unifiedSpr.etilizeId, etilizeId) : undefined
						),
						not(unifiedSpr.deleted)
					),
					columns: {
						id: true,
						sprc: true
					}
				});

				// Prefer exact SPRC match
				const exactMatch = res.find((r: any) => r.sprc === sprc);
				if (exactMatch) return [exactMatch.id];

				return res.map((r: any) => r.id);
			},
			newRowTransform: (row, lastUpdated) => {
				return {
					gid: null,
					sprc: row.sprc,
					status: row.deleted
						? 'DISABLED'
						: row.status === 'Discontinued'
							? 'DISCONTINUED'
							: 'ACTIVE',
					unifiedGuildRow: null,
					unifiedSprRow: row.id,
					qbRow: null,
					shopifyRow: null,
					lastUpdated,
					deleted: row.deleted
				} satisfies typeof unifiedProduct.$inferInsert;
			},
			isDeleted: (row: any) => {
				return row.unifiedSprRowContent?.deleted ?? true;
			}
		},
		otherTables: [
			{
				table: qb,
				refCol: 'qbRow',
				findConnections: async (row, db) => {
					const gid = row.gid;
					const sprc = row.sprc ?? row.unifiedGuildRowContent?.spr ?? null;
					const upc = row.unifiedGuildRowContent?.upc ?? row.unifiedSprRowContent?.upc ?? null;

					if (!gid && !sprc && !upc) return [];

					// QB IDs are formatted as "Category:UPC" or similar patterns
					const patterns: string[] = [];
					if (gid) patterns.push(`%${gid}%`);
					if (sprc) patterns.push(`%${sprc}%`);
					if (upc) patterns.push(`%${upc}%`);

					const res = await db.query.qb.findMany({
						where: and(
							or(...patterns.map((pattern) => eq(qb.qbId, pattern.replace(/%/g, '')))),
							not(qb.deleted)
						),
						columns: {
							id: true,
							qbId: true
						}
					});

					return res.map((r) => r.id);
				},
				isDeleted: (row) => {
					return row.qbRowContent?.deleted ?? true;
				}
			},
			{
				table: shopify,
				refCol: 'shopifyRow',
				findConnections: async (row, db) => {
					const gid = row.gid;
					const upc = row.unifiedGuildRowContent?.upc ?? row.unifiedSprRowContent?.upc ?? null;

					if (!gid && !upc) return [];

					const res = await db.query.shopify.findMany({
						where: and(
							or(
								gid ? eq(shopify.vSku, gid) : undefined,
								upc ? eq(shopify.vBarcode, upc) : undefined
							),
							not(shopify.deleted)
						),
						columns: {
							id: true,
							vSku: true
						}
					});

					// Prefer exact SKU match
					const exactMatch = res.find((r) => r.vSku === gid);
					if (exactMatch) return [exactMatch.id];

					return res.map((r) => r.id);
				},
				isDeleted: (row) => {
					return row.shopifyRowContent?.deleted ?? true;
				}
			}
		]
	},
	additionalColValidators: {
		status: (value) => {
			if (value !== null && !productStatusEnum.enumValues.includes(value as any)) {
				return {
					invalidDataType: {
						value: value as string,
						message: `Value "${value}" is not a valid status; Valid statuses are: ${productStatusEnum.enumValues.join(', ')}`
					}
				};
			}
		},
		um: (value) => {
			if (value !== null && !productUmEnum.enumValues.includes(value as any)) {
				return {
					invalidDataType: {
						value: value as string,
						message: `Value "${value}" is not a valid unit of measure; Valid units are: ${productUmEnum.enumValues.join(', ')}`
					}
				};
			}
		},
		category: (value) => {
			if (value !== null && !productCategoryEnum.enumValues.includes(value as any)) {
				return {
					invalidDataType: {
						value: value as string,
						message: `Value "${value}" is not a valid category; Valid categories are: ${productCategoryEnum.enumValues.join(', ')}`
					}
				};
			}
		}
	}
});

function mapCategory(
	guildCategory: string | null | undefined,
	sprCategory: string | null | undefined
): 'office' | 'technologyInk' | 'furniture' | 'cleaningBreakRoom' | null {
	const category = guildCategory ?? sprCategory;

	if (!category) return null;

	return categoryMap[category] ?? null;
}

const categoryMap: {
	[key: string]: 'office' | 'technologyInk' | 'furniture' | 'cleaningBreakRoom';
} = {
	// Guild categories
	officeSchool: 'office',
	technology: 'technologyInk',
	inkToner: 'technologyInk',
	// SPR categories (most already map directly)
	office: 'office',
	technologyInk: 'technologyInk',
	furniture: 'furniture',
	cleaningBreakRoom: 'cleaningBreakRoom'
};

function mapUm(
	guildUm: string | null | undefined,
	sprUm: string | null | undefined,
	qbUm: string | null | undefined
): 'ea' | 'pk' | 'bx' | null {
	const um = guildUm ?? sprUm ?? qbUm;

	if (!um) return null;

	return umMap[um.toLowerCase()] ?? null;
}

const umMap: { [key: string]: 'ea' | 'pk' | 'bx' } = {
	ea: 'ea',
	pk: 'pk',
	bx: 'bx',
	bg: 'pk',
	ct: 'pk',
	cs: 'bx',
	cd: 'pk',
	ev: 'pk',
	kt: 'pk',
	st: 'pk',
	sl: 'pk',
	tb: 'pk',
	pr: 'ea',
	pac: 'pk',
	box: 'bx'
};
