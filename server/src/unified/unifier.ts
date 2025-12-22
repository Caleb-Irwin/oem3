import { uniref } from '../db.schema';
import { db, db as DB, type Tx } from '../db';
import { eq, isNull, type SQLWrapper, gt, or } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { chunk } from '../utils/chunk';
import {
	insertHistory,
	insertMultipleHistoryRows,
	type InsertHistoryRowOptions
} from '../utils/history';
import { KV } from '../utils/kv';
import { cellTransformer, createCellConfigurator } from './cellConfigurator';
import type { NewError } from './errorManager';
import { retryableTransaction } from './retryableTransaction';
import PromisePool from '@supercharge/promise-pool';
import type {
	AnyConnection,
	CellConfigTable,
	Connections,
	OtherSourceTables,
	PrimarySourceTables,
	SecondarySourceTables,
	UnifiedTables
} from './types';
import { VerifyCellValue } from './cellVerification';
import type { PrimarySecondaryTableConnection } from './types';
import { ConnectionManager } from './connections';

export function createUnifier<
	RowType extends RowTypeBase<TableType>,
	TableType extends UnifiedTables,
	CellConfTable extends CellConfigTable,
	Primary extends PrimarySourceTables,
	Other extends OtherSourceTables,
	Secondary extends SecondarySourceTables | null = null
>(conf: CreateUnifierConf<RowType, TableType, CellConfTable, Primary, Other, Secondary>) {
	const { table, confTable, getRow, transform, connections, version } = conf;

	const tableConf = getTableConfig(table),
		unifiedTableName = tableConf.name;

	const allConnections: AnyConnection[] = [
		connections.primaryTable,
		...(connections.secondaryTable ? [connections.secondaryTable] : []),
		...connections.otherTables
	];

	const connectionColumns = new Set(allConnections.map((c) => c.refCol.toString()));

	async function _modifyRow(
		id: number,
		row: Partial<TableType['$inferInsert']>,
		db: Tx | typeof DB
	) {
		await db
			.update(table)
			.set(row as unknown as any)
			.where(eq(table.id, id))
			.execute();
	}

	const verifyCellValue = VerifyCellValue<RowType, TableType, CellConfTable>(conf);

	const connectionsManager = ConnectionManager({
		conf,
		_modifyRow
	});

	async function _updateRow({
		id,
		db,
		onUpdateCallback,
		nestedMode = false,
		removeAutoMatch = false
	}: {
		id: number;
		db: Tx | typeof DB;
		onUpdateCallback: OnUpdateCallback;
		nestedMode?: boolean;
		removeAutoMatch?: boolean;
	}) {
		const originalRow = await getRow(id, db);
		let updatedRow = structuredClone(originalRow);
		const cellConfigurator = await createCellConfigurator({
			table: confTable,
			unifiedTable: table,
			id,
			uniId: originalRow.uniref.uniId,
			db,
			verifyCellValue
		});

		// 1. Check + make connections
		updatedRow = await connectionsManager.updateConnections({
			db,
			id,
			onUpdateCallback,
			nestedMode,
			removeAutoMatch,
			originalRow,
			updatedRow,
			cellConfigurator,
			_updateRow
		});

		// 2. Transform
		const transformed = transform(updatedRow, cellTransformer);

		// 3. Apply Overrides + Find Errors
		const { changes, changesToCommit } = await cellConfigurator.getConfiguredRow<
			TableType,
			RowType
		>(transformed, originalRow, connectionColumns);

		const { errorsToAdd, errorsToRemove } = await cellConfigurator.commitErrors();
		const hasChanges = Object.keys(changes).length > 0;

		// 4. Update Row
		const time = Date.now();
		if (hasChanges) await _modifyRow(id, { lastUpdated: time, ...changesToCommit }, db);

		// 5. Update History
		const history: InsertHistoryRowOptions<TableType['$inferSelect']> | null = hasChanges
			? {
					uniref: originalRow.uniref.uniId,
					prev: originalRow,
					entryType: 'update',
					data: changes as Partial<RowType>,
					created: time
				}
			: null;
		if (history)
			await insertHistory({
				db,
				resourceType: unifiedTableName as any,
				...history
			});

		if (hasChanges || errorsToRemove.length > 0 || errorsToAdd.length > 0) {
			onUpdateCallback(originalRow.uniref.uniId);
		}

		return {
			history,
			newErrors: errorsToAdd
		};
	}

	async function updateRow(id: number, onUpdateCallback: OnUpdateCallback) {
		return await retryableTransaction(async (tx) => {
			return await _updateRow({ id, db: tx, onUpdateCallback });
		});
	}

	async function _addMissingRows({
		newLastUpdated,
		rowsToUpdate,
		connection
	}: {
		newLastUpdated: number;
		rowsToUpdate: Set<number>;
		connection: PrimarySecondaryTableConnection<RowType, TableType, any>;
	}) {
		await DB.transaction(async (db) => {
			const missingPrimaryRows = await db
				.select()
				.from(connection.table as any)
				.leftJoin(
					table as UnifiedTables,
					eq(connection.table.id, table[connection.refCol] as SQLWrapper)
				)
				.where(isNull(table.id))
				.execute();
			const primaryTableName = getTableConfig(connection.table).name;
			const rowsToInsert = missingPrimaryRows.map((v) =>
				connection.newRowTransform(
					v[primaryTableName as unknown as keyof typeof v] as any,
					newLastUpdated
				)
			);
			for (const chunkedRows of chunk(rowsToInsert)) {
				const rows = await db
					.insert(table as any)
					.values(chunkedRows)
					.returning({ id: table.id })
					.execute();
				rows.forEach(({ id }) => rowsToUpdate.add(id));
				const uniRows = await db
					.insert(uniref)
					.values(
						rows.map(({ id }) => {
							const obj: any = {
								resourceType: unifiedTableName as any
							};
							obj[unifiedTableName] = id;
							return obj;
						})
					)
					.returning({ uniId: uniref.uniId })
					.execute();
				await insertMultipleHistoryRows({
					db,
					resourceType: unifiedTableName as any,
					rows: chunkedRows.map((v, i) => ({
						uniref: uniRows[i].uniId,
						entryType: 'create',
						data: v as any,
						created: newLastUpdated
					}))
				});
			}
		});
	}
	async function _updateRows({
		progress,
		onUpdateCallback,
		rowsToUpdate
	}: {
		progress?: (progress: number) => void;
		onUpdateCallback: OnUpdateCallback;
		rowsToUpdate: Set<number>;
	}) {
		if (progress) progress(0);
		let done = 0;
		await PromisePool.withConcurrency(5)
			.for(Array.from(rowsToUpdate))
			.handleError(async (error) => {
				console.error('Error updating row:', error);
				throw error;
			})
			.onTaskFinished(() => {
				done++;
				if (progress && done % 100 === 0) progress(done / rowsToUpdate.size);
			})
			.process(async (id) => {
				await updateRow(id, onUpdateCallback);
			});
		if (progress) progress(1);
	}

	async function updateUnifiedTable({
		updateAll = false,
		progress,
		onUpdateCallback
	}: {
		updateAll?: boolean;
		progress?: (progress: number) => void;
		onUpdateCallback: OnUpdateCallback;
	}) {
		if (progress) progress(-1);
		const initKV = new KV('unifier/' + unifiedTableName, DB);
		const newLastUpdated = Date.now(),
			originalLastUpdatedBySource: { [key: string]: number } = JSON.parse(
				(await initKV.get('lastUpdatedBySource')) ?? '{}'
			),
			lastUpdatedBySource: { [key: string]: number } = { ...originalLastUpdatedBySource },
			rowsToUpdate = new Set<number>();
		if (parseInt((await initKV.get('version')) ?? '-1') < version) {
			updateAll = true;
		}

		// 1. Add missing primary rows
		await _addMissingRows({ newLastUpdated, rowsToUpdate, connection: connections.primaryTable });

		// 2. Determine which rows need to be updated
		if (updateAll) {
			const allRows = await db
				.select({ id: table.id })
				.from(table as UnifiedTables)
				.execute();
			allRows.forEach((v) => rowsToUpdate.add(v.id));
		} else {
			for (const sourceTable of allConnections) {
				const lastUpdated = lastUpdatedBySource[sourceTable.refCol as string] ?? 0;
				const rows = await db
					.select({ id: table.id, lastUpdated: sourceTable.table.lastUpdated })
					.from(table as UnifiedTables)
					.leftJoin(
						sourceTable.table as any,
						eq(table[sourceTable.refCol as keyof UnifiedTables] as SQLWrapper, sourceTable.table.id)
					)
					.where(
						or(
							isNull(sourceTable.table.lastUpdated),
							gt(sourceTable.table.lastUpdated, lastUpdated)
						)
					);
				lastUpdatedBySource[sourceTable.refCol as string] = rows.reduce(
					(prev, curr) => (curr.lastUpdated && prev < curr.lastUpdated ? curr.lastUpdated : prev),
					lastUpdated
				);
				if (lastUpdatedBySource[sourceTable.refCol as string] > lastUpdated)
					// If no rows are updated, there will also be no new connections
					rows.forEach((r) => rowsToUpdate.add(r.id!));
			}
		}

		// 3. Update Rows
		await _updateRows({
			progress,
			onUpdateCallback,
			rowsToUpdate
		});

		// 4. Secondary Sources
		if (connections.secondaryTable) {
			const secondaryRowsToUpdate = new Set<number>();
			await _addMissingRows({
				newLastUpdated,
				rowsToUpdate: secondaryRowsToUpdate,
				connection: connections.secondaryTable
			});
			await _updateRows({
				progress,
				onUpdateCallback,
				rowsToUpdate: secondaryRowsToUpdate
			});
		}

		// 5. Finish
		await retryableTransaction(
			async (db) => {
				const kv = new KV('unifier/' + unifiedTableName, db);
				const lastUpdatedNew = JSON.parse((await kv.get('lastUpdatedBySource')) ?? '{}');
				const newLastUpdated: { [key: string]: number } = {};
				for (const k of Object.keys(lastUpdatedBySource)) {
					newLastUpdated[k] =
						lastUpdatedNew[k] && lastUpdatedNew[k] < (originalLastUpdatedBySource[k] ?? 2)
							? lastUpdatedNew[k]
							: lastUpdatedBySource[k];
				}
				await kv.set('lastUpdatedBySource', JSON.stringify(newLastUpdated));
				await kv.set('version', version.toString());
			},
			10,
			'serializable'
		);
	}

	async function recordMatchesInvalidatedByRefCol(refCol: string) {
		await retryableTransaction(
			async (db) => {
				const kv = new KV('unifier/' + unifiedTableName, db);
				const lastUpdatedBySource = JSON.parse((await kv.get('lastUpdatedBySource')) ?? '{}');
				const prevRun = lastUpdatedBySource[refCol] ?? 0;
				lastUpdatedBySource[refCol] = prevRun <= 0 ? prevRun - 1 : 0;
				await kv.set('lastUpdatedBySource', JSON.stringify(lastUpdatedBySource));
			},
			10,
			'serializable'
		);
	}

	return {
		updateUnifiedTable,
		updateRow,
		_updateRow,
		verifyCellValue,
		recordMatchesInvalidatedByRefCol,
		conf
	};
}

export type Unifier<
	RowType extends RowTypeBase<TableType>,
	TableType extends UnifiedTables,
	CellConfTable extends CellConfigTable,
	Primary extends PrimarySourceTables = PrimarySourceTables,
	Other extends OtherSourceTables = OtherSourceTables
> = ReturnType<typeof createUnifier<RowType, TableType, CellConfTable, Primary, Other>>;

export interface CreateUnifierConf<
	RowType extends RowTypeBase<TableType>,
	TableType extends UnifiedTables,
	CellConfTable extends CellConfigTable,
	Primary extends PrimarySourceTables,
	Other extends OtherSourceTables,
	Secondary extends SecondarySourceTables | null = null
> {
	table: TableType;
	confTable: CellConfTable;
	getRow: (id: number, db: Tx | typeof DB) => Promise<RowType>;
	transform: (
		item: RowType,
		t: typeof cellTransformer<TableType, keyof TableType['$inferSelect']>
	) => {
		[K in keyof TableType['$inferSelect']]: ReturnType<
			typeof cellTransformer<TableType, keyof TableType['$inferSelect']>
		>;
	};
	connections: Connections<RowType, TableType, Primary, Secondary, Other>;
	additionalColValidators: AdditionalColValidator<TableType>;
	version: number;
}

export type RowTypeBase<TableType extends UnifiedTables> = TableType['$inferSelect'] & {
	uniref: { uniId: number };
	id: number;
	deleted: boolean;
};

type AdditionalColValidator<TableType extends UnifiedTables> = {
	[K in keyof TableType['$inferSelect']]?: (
		value: TableType['$inferSelect'][K],
		db: typeof DB | Tx
	) => NewError | undefined | void | Promise<NewError | undefined | void>;
};

export type OnUpdateCallback = (uniId: number) => void;
