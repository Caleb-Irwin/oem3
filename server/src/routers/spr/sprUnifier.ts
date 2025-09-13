import { and, eq, not, or } from 'drizzle-orm';
import { db as DB, type Tx } from '../../db';
import { createUnifier } from '../../unified/unifier';
import { unifiedSpr, unifiedSprCellConfig } from '../../db.schema';
import { sprCategoryEnum, type SprCategoryEnum } from './table';
import { sprPriceFile, sprPriceStatusEnum, sprPriceUmEnum } from './priceFile/table';
import { sprFlatFile } from './flatFile/table';
import { decode } from 'he';

const getRow = async (id: number, db: typeof DB | Tx) => {
	const res = await db.query.unifiedSpr
		.findFirst({
			where: eq(unifiedSpr.id, id),
			with: {
				sprPriceFileRowContent: true,
				sprFlatFileRowContent: {
					with: {
						enhancedContent: true
					}
				},
				uniref: true
			}
		})
		.execute();
	if (res === undefined) throw new Error(`UnifiedSPR#${id} not found`);
	return res;
};

type SprRowType = Awaited<ReturnType<typeof getRow>>;

export const sprUnifier = createUnifier<
	SprRowType,
	typeof unifiedSpr,
	typeof unifiedSprCellConfig,
	typeof sprPriceFile,
	typeof sprFlatFile
>({
	table: unifiedSpr,
	confTable: unifiedSprCellConfig,
	version: 24,
	getRow,
	transform: (item, t) => {
		const price = item.sprPriceFileRowContent;
		const flat = item.sprFlatFileRowContent;
		const enh = flat?.enhancedContent ?? null;

		const etilizePrimary = price?.etilizeId ?? null;
		const etilizeSecondary = flat?.etilizeId ?? null;
		const upcPrimary = price?.upc ?? null;
		const upcSecondary = enh?.upc ?? null;

		return {
			id: t('id', item.id),
			sprc: t('sprc', item.sprc),

			sprPriceFileRow: t('sprPriceFileRow', item.sprPriceFileRow),
			sprFlatFileRow: t('sprFlatFileRow', item.sprFlatFileRow, { shouldNotBeNull: true }),

			etilizeId: t('etilizeId', etilizePrimary ?? etilizeSecondary, {
				shouldMatch: {
					primary: 'Price File Etilize ID',
					secondary: 'Flat File Etilize ID',
					val: etilizeSecondary,
					ignore: etilizePrimary === null || etilizeSecondary === null
				}
			}),
			cws: t('cws', enh?.cws ?? null),
			gtin: t('gtin', enh?.gtin ?? null),
			upc: t('upc', upcPrimary ?? upcSecondary ?? null, {
				// shouldMatch: {
				// 	primary: 'Price File UPC',
				// 	secondary: 'Enhanced UPC',
				// 	val: upcSecondary,
				// 	ignore: upcPrimary === null || upcSecondary === null
				// }
			}),

			shortTitle: t('shortTitle', price.description ?? null),
			title: t(
				'title',
				(flat?.mainTitle ?? price.description)
					? decode((flat?.mainTitle ?? price.description) as string)
					: null
			),
			description: t(
				'description',
				flat
					? flat.marketingText + '<br><br>' + flat.fullDescription + '<br><br>' + flat.productSpecs
					: null
			),
			category: t(
				'category',
				flat?.masterDepartmentNumber ? (categoryMap[flat?.masterDepartmentNumber] ?? null) : null
			),

			dealerNetPriceCents: t('dealerNetPriceCents', price.dealerNetPriceCents ?? null, {
				shouldNotBeNull: true
			}),
			netPriceCents: t('netPriceCents', price.netPriceCents ?? null, {
				shouldNotBeNull: true
			}),
			listPriceCents: t('listPriceCents', price.listPriceCents ?? null, {
				shouldNotBeNull: true
			}),
			status: t('status', price.status ?? null),
			um: t('um', price.um ?? null),

			primaryImage: t(
				'primaryImage',
				(enh?.primaryImage
					? `https://content.etilize.com/${enh.primaryImage}/${enh.etilizeId}.jpg`
					: null) ??
					flat?.image255 ??
					flat?.image75 ??
					(price.etilizeId ? `https://content.etilize.com/${225}/${price.etilizeId}.jpg` : null)
			),
			primaryImageDescription: t('primaryImageDescription', `Image of ${price.sprcSku}`),
			otherImagesJsonArr: t(
				'otherImagesJsonArr',
				enh?.otherImagesJsonArr
					? JSON.stringify(
							JSON.parse(enh.otherImagesJsonArr).map((img: string) => ({
								url: `https://content.etilize.com/${img}/${enh.etilizeId}.jpg`,
								description: `${img.replaceAll('-', ' ')}`
							}))
						)
					: null
			),

			keywords: t('keywords', flat?.keywords ?? null),
			brandName: t('brandName', flat?.brandName ?? null),
			manufacturerName: t('manufacturerName', flat?.manufacturerName ?? null),

			deleted: t(
				'deleted',
				price.deleted /* || price.status === 'Discontinued' */ || price.status === null
			),
			lastUpdated: t('lastUpdated', item.lastUpdated)
		};
	},
	connections: {
		primaryTable: {
			table: sprPriceFile,
			refCol: 'sprPriceFileRow',
			findConnections: async (row, db) => {
				const sku = row.sprc;
				if (!sku || sku === '') return [];
				const res = await db.query.sprPriceFile.findMany({
					where: and(eq(sprPriceFile.sprcSku, sku), not(sprPriceFile.deleted)),
					columns: { id: true }
				});
				return res.map((r) => r.id);
			},
			newRowTransform: (row, lastUpdated) => {
				return {
					sprc: row.sprcSku,
					sprPriceFileRow: row.id,
					sprFlatFileRow: null,
					lastUpdated,
					deleted: row.deleted
				};
			},
			isDeleted: (row) => {
				return (
					row.sprPriceFileRowContent.deleted ||
					// row.sprPriceFileRowContent.status === 'Discontinued' ||
					row.sprPriceFileRowContent.status === null
				);
			}
		},
		secondaryTable: null,
		otherTables: [
			{
				table: sprFlatFile,
				refCol: 'sprFlatFileRow',
				allowDeleted: true,
				findConnections: async (row, db) => {
					const sku = row.sprc;
					const etilize = row.sprPriceFileRowContent?.etilizeId ?? null;
					const bestMatches = (
						await db.query.sprFlatFile
							.findMany({
								where: or(
									sku && sku !== ''
										? and(eq(sprFlatFile.sprcSku, sku), not(sprFlatFile.deleted))
										: undefined,
									etilize
										? and(eq(sprFlatFile.etilizeId, etilize), not(sprFlatFile.deleted))
										: undefined
								),
								columns: { id: true }
							})
							.execute()
					).map((r) => r.id);
					if (bestMatches.length > 0) return bestMatches;

					const skuNoDash = sku ? sku.replace(/[-\/\\]/g, '') : '';
					const noDashMatches =
						skuNoDash && skuNoDash !== '' && sku !== skuNoDash
							? (
									await db.query.sprFlatFile
										.findMany({
											where: and(
												eq(sprFlatFile.sprcSkuNoDash, skuNoDash),
												not(sprFlatFile.deleted)
											),
											columns: { id: true }
										})
										.execute()
								).map((r) => r.id)
							: [];
					if (noDashMatches.length > 0) return noDashMatches;

					const deletedMatches = (
						await db.query.sprFlatFile
							.findMany({
								where: or(
									sku && sku !== ''
										? and(eq(sprFlatFile.sprcSku, sku), sprFlatFile.deleted)
										: undefined,
									skuNoDash && skuNoDash !== '' && sku !== skuNoDash
										? and(eq(sprFlatFile.sprcSkuNoDash, skuNoDash), sprFlatFile.deleted)
										: undefined,
									etilize ? and(eq(sprFlatFile.etilizeId, etilize), sprFlatFile.deleted) : undefined
								),
								columns: { id: true }
							})
							.execute()
					).map((r) => r.id);
					return deletedMatches;
				},
				isDeleted: (row) => {
					return row.sprFlatFileRowContent?.deleted ?? true;
				}
			}
		]
	},
	additionalColValidators: {
		status: (value) => {
			if (value !== null && !sprPriceStatusEnum.enumValues.includes(value as any)) {
				return {
					invalidDataType: {
						value: value as string,
						message: `Value "${value}" is not a valid status; Valid statuses are: ${sprPriceStatusEnum.enumValues.join(', ')}`
					}
				};
			}
		},
		um: (value) => {
			if (value !== null && !sprPriceUmEnum.enumValues.includes(value as any)) {
				return {
					invalidDataType: {
						value: value as string,
						message: `Value "${value}" is not a valid unit of measure; Valid units are: ${sprPriceUmEnum.enumValues.join(', ')}`
					}
				};
			}
		},
		category: (value) => {
			if (value !== null && !sprCategoryEnum.enumValues.includes(value as any)) {
				return {
					invalidDataType: {
						value: value as string,
						message: `Value "${value}" is not a valid category; Valid categories are: ${sprCategoryEnum.enumValues.join(', ')}`
					}
				};
			}
		}
	}
});

const categoryMap: {
	[key: string]: SprCategoryEnum | null;
} = {
	'0': null,
	'2': 'furniture',
	'3': 'office',
	'4': 'technologyInk',
	'4397': 'cleaningBreakRoom'
};
