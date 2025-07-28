import { and, eq, not, or } from 'drizzle-orm';
import { db as DB, type Tx } from '../../db';
import { createUnifier } from '../../utils/unifier';
import {
	unifiedGuild,
	guildData,
	guildInventory,
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
				inventoryRowContent: true,
				flyerRowContent: true,
				uniref: true
			}
		})
		.execute();
	if (res === undefined) throw new Error(`UnifiedGuild#${id} not found`);
	return res;
};

type GuildRowType = Awaited<ReturnType<typeof getRow>>;

export const guildUnifier = createUnifier<GuildRowType, typeof unifiedGuild>({
	table: unifiedGuild,
	confTable: unifiedGuildCellConfig,
	version: 7,
	getRow,
	transform: (item, t) => {
		return {
			id: t('id', item.id),
			gid: t('gid', item.gid),
			lastUpdated: t('lastUpdated', item.lastUpdated),

			dataRow: t('dataRow', item.dataRow),
			inventoryRow: t('inventoryRow', item.inventoryRow),
			flyerRow: t('flyerRow', item.flyerRow ?? null),

			upc: t('upc', item.dataRowContent.upc, {
				shouldMatch: {
					name: 'Guild Inventory UPC',
					val: item.inventoryRowContent?.upc ?? null,
					ignore: item.inventoryRowContent === null
				}
			}),
			spr: t('spr', item.dataRowContent.spr, {
				shouldMatch: {
					name: 'Guild Inventory SPR Product ID',
					val: item.inventoryRowContent?.spr ?? null,
					ignore: item.inventoryRowContent === null
				}
			}),
			basics: t('basics', item.dataRowContent.basics, {
				shouldMatch: {
					name: 'Guild Inventory Basics Product ID',
					val: item.inventoryRowContent?.basics ?? null,
					ignore: item.inventoryRowContent === null
				}
			}),
			cis: t('cis', item.dataRowContent.cis, {
				shouldMatch: {
					name: 'Guild Inventory CIS Product ID',
					val: item.inventoryRowContent?.cis ?? null,
					ignore: item.inventoryRowContent === null
				}
			}),
			title: t('title', item.dataRowContent.shortDesc),
			description: t(
				'description',
				item.dataRowContent.desc?.sanitizedDescription || item.dataRowContent.longDesc
			),
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
			costCents: t(
				'costCents',
				(item.dataRowContent.dropshipPriceCents === -1
					? null
					: item.dataRowContent.dropshipPriceCents) ??
					(item.dataRowContent.memberPriceCents === -1
						? null
						: item.dataRowContent.memberPriceCents)
			),
			um: t('um', item.dataRowContent.um, {
				shouldMatch: {
					name: 'Guild Inventory UM',
					val: item.inventoryRowContent?.um ?? null,
					ignore: item.inventoryRowContent === null
				}
			}),
			qtyPerUm: t('qtyPerUm', item.dataRowContent.standardPackQty, {
				// shouldMatch: {
				//   name: "Guild Inventory Qty Per UM",
				//   val: item.inventoryRowContent?.qtyPerUm ?? null,
				//   ignore: item.inventoryRowContent === null,
				// },
			}),
			masterPackQty: t('masterPackQty', item.dataRowContent.masterPackQty),
			imageUrl: t(
				'imageUrl',
				(item.dataRowContent.desc?.imageListJSON
					? (JSON.parse(item.dataRowContent.desc?.imageListJSON)[0] ?? null)
					: null) ?? item.dataRowContent.imageURL
			),
			primaryImageDescription: t('primaryImageDescription', `Image of ${item.gid}`),
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
			weightGrams: t('weightGrams', item.dataRowContent.weightGrams),
			heavyGoodsChargeSkCents: t(
				'heavyGoodsChargeSkCents',
				item.dataRowContent.heavyGoodsChargeSkCents
			),
			inventory: t('inventory', item.inventoryRowContent?.onHand ?? null),
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
		otherTables: [
			{
				table: guildInventory,
				refCol: 'inventoryRow',
				findConnections: async (row, db) => {
					if (
						(row.gid === null || row.gid === '') &&
						(row.dataRowContent === null ||
							row.dataRowContent.upc === '' ||
							row.dataRowContent.upc === null)
					)
						return [];
					const rows = await db.query.guildInventory
						.findMany({
							where: or(
								row.gid !== null && row.gid !== ''
									? and(eq(guildInventory.gid, row.gid), not(guildInventory.deleted))
									: undefined,
								row.dataRowContent !== null &&
									row.dataRowContent.upc !== null &&
									row.dataRowContent.upc !== ''
									? and(eq(guildInventory.upc, row.dataRowContent.upc), not(guildInventory.deleted))
									: undefined
							),
							columns: {
								id: true
							}
						})
						.execute();
					return rows.map((r) => r.id);
				},
				isDeleted: (row) => {
					return row.inventoryRowContent?.deleted ?? true;
				}
			},
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
