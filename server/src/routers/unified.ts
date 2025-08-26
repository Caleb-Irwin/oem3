import { z } from 'zod';
import { history, unifiedGuild, uniref, type CellSetting } from '../db.schema';
import { generalProcedure, router, viewerProcedure } from '../trpc';
import { db } from '../db';
import { desc, eq } from 'drizzle-orm';
import { getColConfig } from '../unified/cellVerification';
import {
	type UnifiedTableNames,
	type UnifiedTables,
	type CellConfigRowInsert,
	type CellConfigRowSelect,
	UnifiedTableNamesArray
} from '../unified/types';
import { createUnifiedSub, unifiedOnUpdateCallback } from './unified.helpers';
import { getCellConfigHelper } from '../unified/cellConfigHelper';
import { UnifierMap } from '../unified/unifier.map';
import { getResourceByCol } from './resources';
import { getErrorUrl, getFirstErrorUrl, updateError } from '../unified/unifiedCellErrors';
import { getFirstUnmatchedUrl, getUnmatchedUrl, updateUnmatched } from '../unified/unmatchedErrors';

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
	refresh: generalProcedure
		.input(
			z.object({
				table: z.enum(UnifiedTableNamesArray),
				refId: z.number()
			})
		)
		.mutation(async ({ input: { refId, table } }) => {
			const unifier = UnifierMap[table].unifier;
			await unifier._updateRow({
				id: refId,
				db: db,
				onUpdateCallback: unifiedOnUpdateCallback
			});
		}),
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
			const { updateSetting } = await getCellConfigHelper(
				input.compoundId,
				input.col,
				db,
				unifiedOnUpdateCallback
			);
			await updateSetting(input.settingData);
		}),
	updateError,
	getErrorUrl,
	getFirstErrorUrl,
	updateUnmatched,
	getUnmatchedUrl,
	getFirstUnmatchedUrl
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
