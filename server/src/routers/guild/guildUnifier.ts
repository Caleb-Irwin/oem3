import { and, eq, not } from 'drizzle-orm';
import { db as DB, type Tx } from '../../db';
import { createUnifier } from '../../unified/unifier';
import {
	unifiedGuild,
	guildData,
	guildFlyer,
	unifiedGuildCellConfig,
	categoryEnum,
	guildUmEnum
} from '../../db.schema';

const getRow = async (id: number, db: typeof DB | Tx) => {
	const res = await db.query.unifiedGuild
		.findFirst({
			where: eq(unifiedGuild.id, id),
			with: {
				dataRowContent: {
					with: {
						desc: true
					}
				},
				flyerRowContent: true,
				uniref: true
			}
		})
		.execute();
	if (res === undefined) throw new Error(`UnifiedGuild#${id} not found`);
	return res;
};

type GuildRowType = Awaited<ReturnType<typeof getRow>>;

export const guildUnifier = createUnifier<
	GuildRowType,
	typeof unifiedGuild,
	typeof unifiedGuildCellConfig,
	typeof guildData,
	typeof guildFlyer
>({
	table: unifiedGuild,
	confTable: unifiedGuildCellConfig,
	version: 37,
	getRow,
	transform: (item, t) => {
		return {
			id: t('id', item.id),
			gid: t('gid', item.gid),
			lastUpdated: t('lastUpdated', item.lastUpdated),

			dataRow: t('dataRow', item.dataRow),
			flyerRow: t('flyerRow', item.flyerRow),

			upc: t('upc', item.dataRowContent.upc || null),
			spr: t('spr', item.dataRowContent.spr || null),
			basics: t('basics', item.dataRowContent.basics || null),
			cis: t('cis', item.dataRowContent.cis || null),
			title: t('title', item.dataRowContent.shortDesc),
			description: t('description', item.dataRowContent.longDesc || item.dataRowContent.shortDesc),
			priceCents: t(
				'priceCents',
				item.flyerRowContent?.flyerPriceL1Cents ?? item.dataRowContent.priceL1Cents,
				{
					shouldNotBeNull: true
				}
			),
			comparePriceCents: t(
				'comparePriceCents',
				item.flyerRowContent?.flyerPriceL1Cents ? item.dataRowContent.priceL1Cents : null
			),
			inFlyer: t('inFlyer', item.flyerRowContent && item.flyerRowContent.deleted === false),
			costCents: t(
				'costCents',
				(item.dataRowContent.dropshipPriceCents === -1
					? null
					: item.dataRowContent.dropshipPriceCents) ??
					(item.dataRowContent.memberPriceCents === -1
						? null
						: item.dataRowContent.memberPriceCents)
			),
			um: t('um', item.dataRowContent.um),
			qtyPerUm: t('qtyPerUm', item.dataRowContent.standardPackQty),
			masterPackQty: t('masterPackQty', item.dataRowContent.masterPackQty),
			imageUrl: t(
				'imageUrl',
				(item.dataRowContent.desc?.imageListJSON
					? (JSON.parse(item.dataRowContent.desc?.imageListJSON)[0] ?? null)
					: null) ?? item.dataRowContent.imageURL
			),
			imageDescription: t('imageDescription', `Image of ${item.gid}`),
			otherImageListJSON: t(
				'otherImageListJSON',
				item.dataRowContent.desc?.imageListJSON &&
					JSON.parse(item.dataRowContent.desc?.imageListJSON).length > 1
					? JSON.stringify(
							(JSON.parse(item.dataRowContent.desc?.imageListJSON).slice(1) as string[]).map(
								(url, idx) => ({
									url,
									description: `Alternate image #${idx + 1} of ${item.gid}`
								})
							)
						)
					: null
			),
			vendor: t('vendor', item.dataRowContent.vendor),
			category: t(
				'category',
				categoryMap[item.dataRowContent.webCategory.toString().slice(0, 1)] ?? null
			),
			weightGrams: t(
				'weightGrams',
				item.dataRowContent.weightGrams > 0 ? item.dataRowContent.weightGrams : null
			),
			heavyGoodsChargeSkCents: t(
				'heavyGoodsChargeSkCents',
				item.dataRowContent.heavyGoodsChargeSkCents
			),
			freightFlag: t('freightFlag', item.dataRowContent.freightFlag),
			deleted: t('deleted', item.dataRowContent.deleted)
		};
	},
	connections: {
		primaryTable: {
			table: guildData,
			refCol: 'dataRow',
			findConnections: async (row, db) => {
				if (row.gid === null || row.gid === '') return [];
				const res = await db.query.guildData.findMany({
					where: and(eq(guildData.gid, row.gid), not(guildData.deleted)),
					columns: {
						id: true
					}
				});
				return res.map((r) => r.id);
			},
			newRowTransform: (row, lastUpdated) => {
				return {
					gid: row.gid,
					dataRow: row.id,
					lastUpdated,
					deleted: row.deleted
				};
			},
			isDeleted: (row) => {
				return row.dataRowContent.deleted;
			}
		},
		secondaryTable: null,
		otherTables: [
			{
				table: guildFlyer,
				refCol: 'flyerRow',
				findConnections: async (row, db) => {
					if (row.gid === null || row.gid === '') return [];
					const res = await db.query.guildFlyer
						.findMany({
							where: and(eq(guildFlyer.gid, row.gid), not(guildFlyer.deleted)),
							columns: {
								id: true
							}
						})
						.execute();
					return res.map((r) => r.id);
				},
				isDeleted: (row) => {
					return row.flyerRowContent?.deleted ?? true;
				}
			}
		]
	},
	additionalColValidators: {
		um: (value) => {
			if (!guildUmEnum.enumValues.includes(value as any)) {
				return {
					invalidDataType: {
						value: value as string,
						message: `Value "${value}" is not a valid unit of measure; Valid units are: ${guildUmEnum.enumValues.join(
							', '
						)}`
					}
				};
			}
		},
		category: (value) => {
			if (!categoryEnum.enumValues.includes(value as any)) {
				return {
					invalidDataType: {
						value: value as string,
						message: `Value "${value}" is not a valid category; Valid categories are: ${categoryEnum.enumValues.join(
							', '
						)}`
					}
				};
			}
		}
	}
});

const categoryMap = {
	'2': 'officeSchool',
	'3': 'officeSchool',
	'4': 'furniture',
	'5': 'cleaningBreakRoom',
	'6': 'technology',
	'7': 'inkToner'
} as {
	[key: string]: 'officeSchool' | 'technology' | 'furniture' | 'cleaningBreakRoom' | 'inkToner';
};
