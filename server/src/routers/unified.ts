import { z } from 'zod';
import { CellErrorArray, history, unifiedGuild, uniref, type CellSetting } from '../db.schema';
import { generalProcedure, router, viewerProcedure } from '../trpc';
import { db } from '../db';
import { and, desc, eq, inArray, max } from 'drizzle-orm';
import {
	getColConfig,
	UnifiedTableNamesArray,
	type UnifiedTableNames,
	type UnifiedTables
} from '../utils/unifier';
import type { CellConfigRowInsert, CellConfigRowSelect } from '../utils/cellConfigurator';
import { getResource } from './resources';
import { ColToTableName, createUnifiedSub, updateUnifiedTopicByUniId } from './unified.helpers';
import { getCellConfigHelper } from '../utils/cellConfigHelper';
import { UnifierMap } from '../utils/unifier.map';

async function getUnified(uniId: number) {
	return {
		...(await getUnifiedRow(uniId)),
		history: await db.query.history.findMany({
			where: eq(history.uniref, uniId),
			orderBy: desc(history.id)
		})
	};
}
export const unifiedRouter = router({
	get: viewerProcedure
		.input(
			z.object({
				uniId: z.number()
			})
		)
		.query(async ({ input: { uniId } }) => {
			return await getUnified(uniId);
		}),
	getSub: createUnifiedSub<{ uniId: number }, Awaited<ReturnType<typeof getUnified>>>(
		async ({ input: { uniId } }) => {
			return await getUnified(uniId);
		}
	),
	updateSetting: generalProcedure
		.input(
			z.object({
				compoundId: z.string(),
				col: z.string(),
				settingData: z.union([
					z.null(),
					z.custom<CellConfigRowInsert>((val) => (typeof val === 'object' ? true : false))
				])
			})
		)
		.mutation(async ({ input }) => {
			const uniId = await db.transaction(
				async (tx) => {
					const { updateSetting, meta } = await getCellConfigHelper(
						input.compoundId,
						input.col,
						tx
					);
					await updateSetting(input.settingData);
					return meta.uniId;
				},
				{ isolationLevel: 'serializable' }
			);
			updateUnifiedTopicByUniId(uniId.toString());
		}),
	getErrorUrl: viewerProcedure
		.input(
			z.object({
				mode: z.enum(['prev', 'next']),
				currentUniId: z.number()
			})
		)
		.query(async ({ input: { mode, currentUniId } }) => {
			const uniRow = await db.query.uniref.findFirst({
				where: eq(uniref.uniId, currentUniId)
			});
			const tableName = uniRow!.resourceType as UnifiedTableNames;
			const refId = uniRow![tableName] as number;

			const allItemsWithErrors = await db
				.selectDistinct({
					id: UnifierMap[tableName].table.id,
					maxCreated: max(UnifierMap[tableName].confTable.created)
				})
				.from(UnifierMap[tableName].table)
				.innerJoin(
					UnifierMap[tableName].confTable,
					eq(UnifierMap[tableName].confTable.refId, UnifierMap[tableName].table.id)
				)
				.where(
					and(
						eq(UnifierMap[tableName].confTable.resolved, false),
						inArray(UnifierMap[tableName].confTable.confType, CellErrorArray)
					)
				)
				.groupBy(UnifierMap[tableName].table.id)
				.orderBy(desc(max(UnifierMap[tableName].confTable.created)));

			if (allItemsWithErrors.length === 0) {
				return {
					url: UnifierMap[tableName].pageUrl
				};
			}

			let newRefId: number | undefined;
			const currentIndex = allItemsWithErrors.findIndex((c) => c.id === refId);
			console.log('Current Index:', currentIndex, newRefId);
			if (currentIndex >= 0) {
				if (mode === 'prev') {
					newRefId = allItemsWithErrors[currentIndex - 1]?.id;
				} else if (mode === 'next') {
					newRefId = allItemsWithErrors[currentIndex + 1]?.id;
				}
			}
			if (!newRefId) {
				newRefId =
					mode === 'prev'
						? allItemsWithErrors[allItemsWithErrors.length - 1].id
						: allItemsWithErrors[0].id;
			}
			const unirefRow = await db.query.uniref.findFirst({
				where: eq(uniref[tableName], newRefId)
			});
			return {
				url: `/app/resource/${unirefRow!.uniId}/unified/errors`
			};
		}),
	getFirstErrorUrl: viewerProcedure
		.input(
			z.object({
				tableName: z.enum(UnifiedTableNamesArray)
			})
		)
		.query(async ({ input: { tableName } }) => {
			const table = UnifierMap[tableName].confTable;
			const firstError = await db
				.select()
				.from(table)
				.where(and(eq(table.resolved, false), inArray(table.confType, CellErrorArray)))
				.orderBy(desc(table.created))
				.limit(1);
			if (firstError.length === 0) {
				throw new Error('No errors found for this table');
			}
			const refId = firstError[0].refId;
			const unirefRow = await db.query.uniref.findFirst({
				where: eq(uniref[tableName], refId)
			});
			return {
				url: `/app/resource/${unirefRow!.uniId}/unified/errors`
			};
		})
});

async function getUnifiedRow(uniId: number): Promise<UnifiedRow<UnifiedTables>> {
	const uniRow = await db.query.uniref.findFirst({ where: eq(uniref.uniId, uniId) });
	if (!uniRow) {
		throw new Error('No row found');
	}
	const type = uniRow.resourceType as UnifiedTableNames;
	const table = UnifierMap[type].table;
	const id = uniRow[type] as number;
	const row = (await db.select().from(table).where(eq(table.id, id)))?.[0];
	if (!row) {
		throw new Error('No row found');
	}
	const cellConfig = await db
		.select()
		.from(UnifierMap[type].confTable)
		.where(eq(UnifierMap[type].confTable.refId, id));
	const allActiveErrors = cellConfig.filter((c) => c.confType.startsWith('error:') && !c.resolved);
	const colConfig = getColConfig(table);

	const cells: Record<keyof typeof row, UnifiedCell> = {} as any;

	for (const columnName of Object.keys(row)) {
		const col = columnName as keyof typeof row;
		const settingConf = cellConfig.find((c) => c.col === col && c.confType.startsWith('setting:'));
		cells[col] = {
			compoundId: `${type}:${id}`,
			col: columnName,
			value: row[col],
			type: colConfig[col].dataType,
			nullable: !colConfig[col].notNull,
			setting: settingConf ? (settingConf.confType as CellSetting) : null,
			cellSettingConf: settingConf || null,
			activeErrors: allActiveErrors.filter((c) => c.col === col),
			allCellConfigs: cellConfig,
			connectionRow: await getResourceByCol(columnName, row[col])
		};
	}

	return {
		uniId: uniId,
		id,
		type,
		row,
		allActiveErrors,
		cells
	};
}

async function getResourceByCol(col: string, value: string | number | boolean | null) {
	if (!Object.hasOwn(ColToTableName, col)) return undefined;
	if (value === null) return null;
	const tableName = ColToTableName[col as keyof typeof ColToTableName];
	return await getResource({
		input: { uniId: -1, type: tableName, id: value as number, includeHistory: false }
	});
}

export interface UnifiedRow<T extends UnifiedTables = UnifiedTables> {
	uniId: number;
	id: number;
	type: UnifiedTableNames;
	row: UnifiedRowTypes;
	allActiveErrors: CellConfigRowSelect[];
	cells: Record<keyof T['$inferSelect'], UnifiedCell>;
}
export type UnifiedGuildRow = UnifiedRow<typeof unifiedGuild>;

export interface UnifiedCell {
	compoundId: string;
	col: string;
	value: string | number | boolean | null;
	type: 'number' | 'string' | 'boolean';
	nullable: boolean;
	setting: CellSetting | null;
	cellSettingConf: CellConfigRowSelect | null;
	activeErrors: CellConfigRowSelect[];
	allCellConfigs: CellConfigRowSelect[];
	connectionRow?: Awaited<ReturnType<typeof getResourceByCol>>;
}

export type UnifiedRowTypes = (typeof unifiedGuild)['$inferSelect'];
