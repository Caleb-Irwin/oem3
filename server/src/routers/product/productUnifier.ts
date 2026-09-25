import { and, eq, inArray, isNotNull, ne, not, or, sql } from 'drizzle-orm';
import { db as DB, type Tx } from '../../db';
import { createUnifier } from '../../unified/unifier';
import { cellTransformer } from '../../unified/cellConfigurator';
import {
	unifiedProduct,
	unifiedProductCellConfig,
	unifiedGuild,
	unifiedSpr,
	qb as qbTable,
	shopify as shopifyTable,
	productCategoryEnum,
	productStatusEnum,
	productUmEnum
} from '../../db.schema';
import { costsMatch, quickBooksTargetPriceCents } from './pricing';

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
	typeof qbTable | typeof shopifyTable,
	typeof unifiedSpr
>({
	table: unifiedProduct,
	confTable: unifiedProductCellConfig,
	version: 26,
	getRow,
	transform: (
		item,
		t: typeof cellTransformer<typeof unifiedProduct, keyof (typeof unifiedProduct)['$inferSelect']>
	) => {
		const guild = item.unifiedGuildRowContent;
		const spr = item.unifiedSprRowContent;
		const qb = item.qbRowContent;

		// Pricing
		const sprPriceCents =
			spr && spr.netPriceCents && spr.dealerNetPriceCents
				? spr.netPriceCents >= 1.8 * spr.dealerNetPriceCents
					? spr.netPriceCents
					: roundUpToNearestTenCents(spr.dealerNetPriceCents * 1.8)
				: (spr?.netPriceCents ?? null);
		const defaultPriceCents = guild?.priceCents ?? sprPriceCents ?? null;
		const onlinePriceCents = defaultPriceCents ?? item.onlinePriceCents ?? null;
		const onlineComparePriceCents =
			guild?.comparePriceCents && onlinePriceCents && guild.comparePriceCents > onlinePriceCents
				? guild.comparePriceCents
				: null;

		// Images
		const primaryImage = spr?.primaryImage ?? guild?.imageUrl ?? item?.primaryImage ?? null;
		const primaryImageDescription =
			spr?.primaryImageDescription ??
			guild?.imageDescription ??
			item?.primaryImageDescription ??
			null;
		const otherImagesJsonArr = spr?.otherImagesJsonArr
			? JSON.parse(spr.otherImagesJsonArr).length > 0
				? spr.otherImagesJsonArr
				: guild?.otherImageListJSON && guild?.imageUrl
					? JSON.stringify([
							...JSON.parse(guild?.otherImageListJSON ?? '[]'),
							{
								url: guild?.imageUrl ?? null,
								description: guild?.imageDescription ?? null
							}
						])
					: null
			: (guild?.otherImageListJSON ?? null);

		const isDiscontinued =
			((guild?.deleted ?? true) && (spr?.deleted ?? true)) || spr?.status === 'Discontinued';
		const category = mapCategory(spr?.category, guild?.category) ?? item.category;

		// Novexco's Etilize titles name the brand, colour and size, so prefer them when the Novexco
		// item is surely the same item in the same unit as Guild's. Without Etilize content Novexco
		// only has an abbreviated title.
		const sameItemAsGuild =
			!!guild &&
			!!spr?.title &&
			spr.sprFlatFileRow !== null &&
			costsMatch(guild.costCents, spr.dealerNetPriceCents);
		const title = (sameItemAsGuild ? spr?.title : null) ?? guild?.title ?? spr?.title ?? item.title;
		const sprAvailable = spr?.status ? spr.status === 'Active' : false;

		const otherProductIDs = `<br><p><span>Product Numbers:</span> ${Array.from(new Set([guild?.gid, guild?.upc, guild?.cis, guild?.basics, guild?.spr, spr?.cws, spr?.upc].filter(Boolean).map((val) => val!.toUpperCase().trim()))).join(' ')}</p>`;
		let description = item.description;
		if (spr?.description && guild?.description) {
			description = `<div class="oem-cont"><p>${guild.description}</p> ${spr.sprMarketingText ? `<p>${spr.sprMarketingText}</p>` : ''} ${spr.sprProductSpecs ?? ''} ${otherProductIDs}</div>`;
		} else if (spr?.description) {
			description = `<div class="oem-cont">${spr.description} ${otherProductIDs}</div>`;
		} else if (guild?.description) {
			description = `<div class="oem-cont">${guild.description} ${otherProductIDs}</div>`;
		}

		return {
			id: t('id', item.id),
			gid: t('gid', guild?.gid ?? item.gid),
			sprc: t('sprc', spr?.sprc ?? guild?.spr ?? item.sprc, {
				shouldMatch: {
					primary: 'Novexco legacy SKU',
					secondary: 'Guild legacy supplier SKU',
					val: guild?.spr ?? null,
					ignore: spr?.sprc == null || guild?.spr == null
				}
			}),
			novexco: t('novexco', spr?.novexco ?? item.novexco),
			status: t(
				'status',
				(item) => (item.deleted ? 'DISABLED' : isDiscontinued ? 'DISCONTINUED' : 'ACTIVE'),
				{
					dependsOn: new Set(['deleted'])
				}
			),

			unifiedGuildRow: t('unifiedGuildRow', item.unifiedGuildRow),
			unifiedSprRow: t('unifiedSprRow', item.unifiedSprRow),
			qbRow: t('qbRow', item.qbRow),
			shopifyRow: t('shopifyRow', item.shopifyRow),

			upc: t('upc', guild?.upc ?? spr?.upc ?? item.upc, {
				shouldMatch: {
					primary: 'Guild UPC',
					secondary: 'Novexco UPC',
					val: spr?.upc ?? null,
					ignore:
						guild?.upc == null ||
						spr?.upc == null ||
						(guild.upc.length >= 12 &&
							spr.upc.length >= 12 &&
							guild.upc.slice(guild.upc.length - 11, guild.upc.length - 1) ===
								spr.upc.slice(spr.upc.length - 11, spr.upc.length - 1))
				}
			}),
			basics: t('basics', guild?.basics ?? null),
			cws: t('cws', spr?.cws ?? null),
			cis: t('cis', guild?.cis ?? null),
			etilizeId: t('etilizeId', spr?.etilizeId ?? null),

			title: t('title', title),
			description: t('description', description),
			category: t('category', category),
			inFlyer: t('inFlyer', guild?.inFlyer ?? false),

			onlinePriceCents: t('onlinePriceCents', onlinePriceCents, {
				shouldMatch: {
					val: guild?.priceCents ?? null,
					primary: 'Calculated Online Price',
					secondary: 'Guild Flyer Price',
					ignore: !guild || !guild.inFlyer || guild.priceCents === null || onlinePriceCents === null
				}
			}),
			onlineComparePriceCents: t('onlineComparePriceCents', onlineComparePriceCents),
			sourceToQuickBooksFactor: t('sourceToQuickBooksFactor', 1),
			quickBooksConversionAdjustmentPercent: t('quickBooksConversionAdjustmentPercent', 0),
			targetQuickBooksPriceCents: t(
				'targetQuickBooksPriceCents',
				(item) =>
					qb
						? quickBooksTargetPriceCents(
								item.onlinePriceCents,
								item.sourceToQuickBooksFactor ?? 1,
								item.quickBooksConversionAdjustmentPercent ?? 0
							)
						: null,
				{
					dependsOn: new Set([
						'onlinePriceCents',
						'sourceToQuickBooksFactor',
						'quickBooksConversionAdjustmentPercent'
					]),
					shouldNotBeNull: guild?.inFlyer ?? false
				}
			),
			guildCostCents: t('guildCostCents', guild?.costCents ?? null),
			sprCostCents: t('sprCostCents', spr?.dealerNetPriceCents ?? null),

			um: t('um', mapUm(guild?.um, spr?.um, qb?.um) ?? item.um, {
				shouldMatch: {
					primary: 'Guild UM',
					secondary: 'Novexco UM',
					val: mapUm(null, spr?.um, null) ?? null,
					ignore: guild?.um == null || spr?.um == null
				}
			}),
			qtyPerUm: t('qtyPerUm', guild?.qtyPerUm ?? null),

			primaryImage: t('primaryImage', primaryImage),
			primaryImageDescription: t('primaryImageDescription', primaryImageDescription),
			otherImagesJsonArr: t('otherImagesJsonArr', otherImagesJsonArr),

			availableForSaleOnline: t(
				'availableForSaleOnline',
				(item) =>
					!item.deleted &&
					item.status !== 'DISABLED' &&
					// (item.category !== 'furniture' || (!!item.weightGrams && item.weightGrams < 30000)) && // Allow all furniture
					// Guild can't supply items directly, so only store stock or Novexco make them orderable
					((item.localInventory ?? 0) > 0 || sprAvailable),
				{
					dependsOn: new Set(['status', 'deleted', 'category', 'weightGrams', 'localInventory'])
				}
			),
			newListingHold: t(
				'newListingHold',
				(item) =>
					item.deleted || item.status === 'DISABLED'
						? null
						: // No restocking, so a new listing would only sell through what is left
							item.status === 'DISCONTINUED'
							? 'discontinued'
							: // Another Novexco code for the same item is preferred (see priceFile/duplicates)
								spr?.duplicateOf
								? 'duplicate'
								: // Only Novexco's abbreviated short description: no description, rarely an image
									!guild && spr && spr.sprFlatFileRow === null
									? 'noEtilizeContent'
									: null,
				{ dependsOn: new Set(['status', 'deleted']) }
			),
			localInventory: t('localInventory', qb?.quantityOnHand ?? null),
			novexcoInventory: t('novexcoInventory', spr?.inventory ?? null),
			sprInventoryAvailability: t('sprInventoryAvailability', spr?.status ?? null),

			weightGrams: t('weightGrams', guild?.weightGrams ?? null),
			vendor: t('vendor', guild?.vendor ?? spr?.manufacturerName ?? null),

			deleted: t('deleted', (!guild || guild.deleted) && (!spr || spr.deleted)),
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
				if (gid) {
					const exactMatch = res.find((r) => r.gid === gid);
					if (exactMatch) return [exactMatch.id];
				}

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
					upc: row.upc,
					cis: row.cis,
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
				const matches = await novexcoMatches(row, db);
				// Guild products follow Novexco re-codes, so they keep one listing with current data. The
				// unifier only lets products with a Guild link change their Novexco link anyway.
				if (row.unifiedGuildRow !== null) return await preferActiveTwins(matches, db);
				// A product without Guild data never takes a Novexco item from one with it. Otherwise the
				// Novexco-only product left behind by a re-code takes it back, and resolving that conflict
				// strips the Guild product's Novexco link and Shopify listing.
				if (matches.length === 0) return matches;
				const heldByGuildProducts = await db.query.unifiedProduct.findMany({
					where: and(
						inArray(unifiedProduct.unifiedSprRow, matches),
						isNotNull(unifiedProduct.unifiedGuildRow),
						ne(unifiedProduct.id, row.id)
					),
					columns: { unifiedSprRow: true }
				});
				return matches.filter((id) => !heldByGuildProducts.some((p) => p.unifiedSprRow === id));
			},
			newRowTransform: (row, lastUpdated) => {
				return {
					gid: null,
					sprc: row.sprc,
					novexco: row.novexco,
					status: row.deleted
						? 'DISABLED'
						: row.status === 'Discontinued'
							? 'DISCONTINUED'
							: 'ACTIVE',
					unifiedGuildRow: null,
					unifiedSprRow: row.id,
					qbRow: null,
					shopifyRow: null,
					upc: row.upc,
					cws: row.cws,
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
				table: qbTable,
				refCol: 'qbRow',
				findConnections: async (row, db) => {
					const gid = row.gid;
					const sprc = row.sprc ?? row.unifiedGuildRowContent?.spr ?? null;
					const upc = row.unifiedGuildRowContent?.upc ?? row.unifiedSprRowContent?.upc ?? null;

					if (!gid && !sprc && !upc) return [];

					if (upc) {
						const exactUpcMatches = await db.query.qb.findMany({
							where: and(eq(qbTable.upc, upc), not(qbTable.deleted)),
							columns: {
								id: true,
								upc: true
							}
						});

						if (exactUpcMatches.length > 0) {
							return exactUpcMatches.map((r) => r.id);
						}

						const shortUpc = upc.length >= 12 ? upc.slice(upc.length - 11, upc.length - 1) : null;

						if (shortUpc) {
							const shortUpcMatches = await db.query.qb.findMany({
								where: and(eq(qbTable.shortUpc, shortUpc), not(qbTable.deleted)),
								columns: {
									id: true,
									shortUpc: true
								}
							});

							if (shortUpcMatches.length > 0) {
								return shortUpcMatches.map((r) => r.id);
							}
						}
					}

					const productNameConditions: any[] = [];

					if (gid) {
						const cleanGid = gid.toUpperCase().replace(/[^A-Z0-9]/g, '');
						productNameConditions.push(
							sql`UPPER(REGEXP_REPLACE(${qbTable.productName}, '[^A-Z0-9]', '', 'g')) = ${cleanGid}`
						);
					}

					if (sprc) {
						const cleanSprc = sprc.toUpperCase().replace(/[^A-Z0-9]/g, '');
						productNameConditions.push(
							sql`UPPER(REGEXP_REPLACE(${qbTable.productName}, '[^A-Z0-9]', '', 'g')) = ${cleanSprc}`
						);
					}

					if (productNameConditions.length > 0) {
						const nameMatches = await db.query.qb.findMany({
							where: and(or(...productNameConditions), not(qbTable.deleted)),
							columns: {
								id: true,
								productName: true
							}
						});

						if (nameMatches.length > 0) {
							return nameMatches.map((r) => r.id);
						}
					}

					return [];
				},
				isDeleted: (row) => {
					return row.qbRowContent?.deleted ?? true;
				}
			},
			{
				table: shopifyTable,
				refCol: 'shopifyRow',
				findConnections: async (row, db) => {
					const own = await ownShopifyMatches(row, db);
					const spr = row.unifiedSprRowContent;

					// An old Novexco code hands its listing to the active code that replaces it (see
					// priceFile/duplicates), unless that code has a listing of its own. It often matches
					// this same listing by UPC, which doesn't count.
					if (own.length > 0 && isReplacedTwin(row)) {
						const replacement = await getProductByNovexco(spr!.duplicateOf!, db);
						if (
							replacement?.unifiedSprRowContent?.status === 'Active' &&
							(await ownShopifyMatches(replacement, db)).every((id) => own.includes(id))
						)
							return [];
					}
					if (own.length > 0 || spr?.status !== 'Active' || !spr.duplicateCodes) return own;

					// The active code takes over the listings of the old codes it replaces
					const twinListings: number[] = [];
					for (const code of spr.duplicateCodes.split(',')) {
						const twin = await getProductByNovexco(code, db);
						if (twin && isReplacedTwin(twin))
							twinListings.push(...(await ownShopifyMatches(twin, db)));
					}
					return twinListings;
				},
				isDeleted: (row) => {
					return row.shopifyRowContent?.deleted ?? true;
				}
			}
		]
	},
	additionalColValidators: {
		sourceToQuickBooksFactor: (value) => {
			if (!Number.isFinite(value) || value <= 0) {
				return {
					invalidDataType: {
						value,
						message: 'Source-to-QuickBooks factor must be greater than zero'
					}
				};
			}
		},
		quickBooksConversionAdjustmentPercent: (value) => {
			if (!Number.isFinite(value) || value <= -100) {
				return {
					invalidDataType: {
						value,
						message: 'QuickBooks conversion adjustment must be greater than -100%'
					}
				};
			}
		},
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

/** Novexco items matching the product's Novexco code, legacy SKU, UPC or CIS number */
async function novexcoMatches(row: ProductRowType, db: typeof DB | Tx): Promise<number[]> {
	const novexco = row.novexco;
	const sprc = row.sprc ?? row.unifiedGuildRowContent?.spr ?? null;
	const upc = row.unifiedGuildRowContent?.upc ?? null;
	const cis = row.unifiedGuildRowContent?.cis ?? null;

	if (!novexco && !sprc && !upc && !cis) return [];

	if (novexco) {
		const novexcoMatches = await db.query.unifiedSpr.findMany({
			where: and(eq(unifiedSpr.novexco, novexco), not(unifiedSpr.deleted)),
			columns: { id: true }
		});

		if (novexcoMatches.length > 0) {
			return novexcoMatches.map((r) => r.id);
		}
	}

	if (sprc) {
		const sprcMatches = await db.query.unifiedSpr.findMany({
			where: and(eq(unifiedSpr.sprc, sprc), not(unifiedSpr.deleted)),
			columns: {
				id: true,
				sprc: true
			}
		});

		if (sprcMatches.length > 0) {
			return sprcMatches.map((r) => r.id);
		}
	}

	if (upc) {
		const upcMatches = await db.query.unifiedSpr.findMany({
			where: and(eq(unifiedSpr.upc, upc), not(unifiedSpr.deleted)),
			columns: {
				id: true,
				upc: true
			}
		});

		if (upcMatches.length > 0) {
			return upcMatches.map((r) => r.id);
		}
	}

	const otherResults = new Set<number>();
	if (cis) {
		const cisMatches = await db.query.unifiedSpr.findMany({
			where: and(eq(unifiedSpr.cws, cis), not(unifiedSpr.deleted)),
			columns: {
				id: true,
				cws: true
			}
		});

		if (cisMatches.length > 0) {
			cisMatches.forEach((r) => otherResults.add(r.id));
		}
	}

	if (upc) {
		const shortUpc = upc.length >= 12 ? upc.slice(upc.length - 11, upc.length - 1) : null;

		if (shortUpc) {
			const shortUpcMatches = await db.query.unifiedSpr.findMany({
				where: and(
					not(unifiedSpr.deleted),
					sql`SUBSTRING(${unifiedSpr.upc}, LENGTH(${unifiedSpr.upc}) - 10, 10) = ${shortUpc}`
				),
				columns: {
					id: true,
					upc: true
				}
			});

			if (shortUpcMatches.length > 0) {
				shortUpcMatches.forEach((r) => otherResults.add(r.id));
			}
		}
	}

	return Array.from(otherResults);
}

/** Swap Novexco items that were re-coded for the active code replacing them */
async function preferActiveTwins(ids: number[], db: typeof DB | Tx): Promise<number[]> {
	if (ids.length === 0) return ids;
	const rows = await db.query.unifiedSpr.findMany({
		where: inArray(unifiedSpr.id, ids),
		columns: { id: true, status: true, duplicateOf: true }
	});
	const result = new Set<number>();
	for (const id of ids) {
		const row = rows.find((r) => r.id === id);
		const twin =
			row?.duplicateOf && row.status !== 'Active'
				? await db.query.unifiedSpr.findFirst({
						where: and(
							eq(unifiedSpr.novexco, row.duplicateOf),
							eq(unifiedSpr.status, 'Active'),
							not(unifiedSpr.deleted)
						),
						columns: { id: true }
					})
				: undefined;
		result.add(twin?.id ?? id);
	}
	return Array.from(result);
}

type ShopifyMatchRow = Pick<ProductRowType, 'gid' | 'sprc' | 'novexco' | 'unifiedGuildRow'> & {
	unifiedGuildRowContent: Pick<
		NonNullable<ProductRowType['unifiedGuildRowContent']>,
		'spr' | 'upc'
	> | null;
	unifiedSprRowContent: Pick<
		NonNullable<ProductRowType['unifiedSprRowContent']>,
		'upc' | 'status' | 'duplicateOf' | 'duplicateCodes'
	> | null;
};

/** Shopify listings matching the product's own SKU, UPC or UPC-based handle */
async function ownShopifyMatches(row: ShopifyMatchRow, db: typeof DB | Tx): Promise<number[]> {
	const gid = row.gid;
	const sprc = row.sprc ?? row.unifiedGuildRowContent?.spr ?? null;
	// Novexco codes share a number space with Guild IDs (other products' vSkus), so only
	// match on it when it is the SKU this product pushes (see pushConvert)
	const novexco = !gid && !sprc ? row.novexco : null;
	const upc = row.unifiedGuildRowContent?.upc ?? row.unifiedSprRowContent?.upc ?? null;

	if (!gid && !sprc && !novexco && !upc) return [];

	// First try to match vSku to gid, sprc, or novexco
	if (gid || sprc || novexco) {
		const skuMatches = await db.query.shopify.findMany({
			where: and(
				or(
					gid ? eq(shopifyTable.vSku, gid) : undefined,
					sprc ? eq(shopifyTable.vSku, sprc) : undefined,
					novexco ? eq(shopifyTable.vSku, novexco) : undefined
				),
				not(shopifyTable.deleted)
			),
			columns: {
				id: true,
				vSku: true
			}
		});

		if (skuMatches.length > 0) {
			// Prefer exact GID match over SPRC match
			if (gid) {
				const exactGidMatch = skuMatches.find((r) => r.vSku === gid);
				if (exactGidMatch) return [exactGidMatch.id];
			}

			return skuMatches.map((r) => r.id);
		}
	}

	// If no SKU match, try to match vBarcode to UPC
	if (upc) {
		const barcodeMatches = await db.query.shopify.findMany({
			where: and(eq(shopifyTable.vBarcode, upc), not(shopifyTable.deleted)),
			columns: {
				id: true,
				vBarcode: true
			}
		});

		if (barcodeMatches.length > 0) {
			return barcodeMatches.map((r) => r.id);
		}
	}

	// Finally, try to match handle to shortened UPC
	if (upc) {
		const shortUpc = upc.length >= 12 ? upc.slice(upc.length - 11, upc.length - 1) : null;

		if (shortUpc) {
			const handleMatches = await db.query.shopify.findMany({
				where: and(eq(shopifyTable.handle, shortUpc), not(shopifyTable.deleted)),
				columns: {
					id: true,
					handle: true
				}
			});

			if (handleMatches.length > 0) {
				return handleMatches.map((r) => r.id);
			}
		}
	}

	return [];
}

/** A Novexco-only product whose code is no longer active and has a preferred twin */
function isReplacedTwin(row: ShopifyMatchRow) {
	const spr = row.unifiedSprRowContent;
	// Products with Guild data keep their listing: Guild still supplies them
	return row.unifiedGuildRow === null && !!spr?.duplicateOf && spr.status !== 'Active';
}

async function getProductByNovexco(
	novexco: string,
	db: typeof DB | Tx
): Promise<ShopifyMatchRow | null> {
	const spr = await db.query.unifiedSpr.findFirst({
		where: and(eq(unifiedSpr.novexco, novexco), not(unifiedSpr.deleted)),
		columns: { id: true }
	});
	if (!spr) return null;
	return (
		(await db.query.unifiedProduct.findFirst({
			where: eq(unifiedProduct.unifiedSprRow, spr.id),
			columns: { gid: true, sprc: true, novexco: true, unifiedGuildRow: true },
			with: {
				unifiedGuildRowContent: { columns: { spr: true, upc: true } },
				unifiedSprRowContent: {
					columns: { upc: true, status: true, duplicateOf: true, duplicateCodes: true }
				}
			}
		})) ?? null
	);
}

function mapCategory(
	sprCategory: string | null | undefined,
	guildCategory: string | null | undefined
): 'office' | 'technologyInk' | 'furniture' | 'cleaningBreakRoom' | null {
	const category = sprCategory ?? guildCategory;

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

function roundUpToNearestTenCents(value: number | null): number | null {
	if (value === null) return null;
	return Math.ceil(value / 10) * 10 - 1;
}
