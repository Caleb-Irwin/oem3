import type { db as DB } from '../db';
import { UnifierMap } from './unifier.map';
import type { CellConfigTable, UnifiedTableNames, CellConfigRowInsert } from './types';
import { eq, and, getTableName } from 'drizzle-orm';
import { getUniId, modifySetting } from './cellSettings';
import { retryableTransaction } from './retryableTransaction';
import { modifyError, type ErrorAction } from './cellErrors';
import type { OnUpdateCallback } from './unifier';
import { updateByTableName } from '../routers/resources';

export async function getCellConfigHelper(
	compoundId: string,
	col: string,
	db: typeof DB,
	onUpdateCallback: OnUpdateCallback
) {
	const parts = compoundId.split(':');
	if (parts.length !== 2) {
		throw new Error(`Invalid compoundId format: ${compoundId}. Expected format: "table:refId"`);
	}

	const [tablePrefixRaw, refIdStr] = parts;
	const refId = Number(refIdStr);

	if (isNaN(refId) || refId <= 0) {
		throw new Error(`Invalid refId in compoundId: ${refIdStr}. Must be a positive number`);
	}

	validateTableName(tablePrefixRaw);

	const tablePrefix = tablePrefixRaw as UnifiedTableNames;

	const table: CellConfigTable = UnifierMap[tablePrefix].confTable,
		unifiedTable = UnifierMap[tablePrefix].table;

	const uniId = await getUniId({ db, unifiedTable, refId });

	const { unifier, allConnections } = UnifierMap[tablePrefix];
	const refCols = new Set(allConnections.map(({ refCol }) => refCol.toString()));
	const refColToTableName = {
		...Object.fromEntries(
			allConnections.map(({ refCol, table }) => [refCol.toString(), getTableName(table)])
		)
	};

	async function getConfigs() {
		return await db
			.select()
			.from(table)
			.where(and(eq(table.refId, refId), eq(table.col, col as any)));
	}

	async function getSetting() {
		const configs = await getConfigs();
		return configs?.find((c) => c.confType.startsWith('setting:')) ?? null;
	}

	async function updateSetting(settingData: CellConfigRowInsert | null) {
		await retryableTransaction(
			async (db) => {
				await modifySetting({
					db,
					table,
					refId,
					col,
					settingData,
					uniIdHint: uniId,
					unifiedTable
				});
				await unifier._updateRow({ id: refId, db: db, onUpdateCallback });
			},
			10,
			'serializable'
		);

		if (refCols.has(col)) {
			await unifier.recordMatchesInvalidatedByRefCol(col);
			updateByTableName(refColToTableName[col]);
		}
		setTimeout(() => {
			UnifierMap[tablePrefix].runUnifierWorker({});
		}, 100);

		onUpdateCallback(uniId);
	}

	async function updateError(errorAction: ErrorAction, errorId: number) {
		await retryableTransaction(
			async (db) => {
				await modifyError({
					db,
					table,
					refId,
					col,
					errorAction,
					errorId,
					unifiedTable,
					uniIdHint: uniId
				});
				await unifier._updateRow({ id: refId, db: db, onUpdateCallback });
			},
			10,
			'serializable'
		);

		if (refCols.has(col)) {
			await unifier.recordMatchesInvalidatedByRefCol(col);
			updateByTableName(refColToTableName[col]);
		}
		setTimeout(() => {
			UnifierMap[tablePrefix].runUnifierWorker({});
		}, 100);

		onUpdateCallback(uniId);
	}

	return {
		meta: {
			table,
			refId,
			tablePrefix,
			compoundId,
			uniId,
			unifier
		},
		getConfigs,
		getSetting,
		updateSetting,
		updateError
	};
}

function validateTableName(tablePrefixRaw: UnifiedTableNames | string) {
	if (!(tablePrefixRaw in UnifierMap)) {
		const supportedTables = Object.keys(UnifierMap).join(', ');
		throw new Error(
			`Unsupported table prefix: ${tablePrefixRaw}. Supported tables: ${supportedTables}`
		);
	}
}
