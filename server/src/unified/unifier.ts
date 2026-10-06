import { uniref } from '../db.schema';
import { db, db as DB, type Tx } from '../db';
import { eq, isNull, type SQLWrapper, gt, or, and, sql, inArray } from 'drizzle-orm';
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
	LostConnection,
	OtherSourceTables,
	PrimarySourceTables,
	SecondarySourceTables,
	UnifiedTables
} from './types';
import { VerifyCellValue } from './cellVerification';
import type { PrimarySecondaryTableConnection } from './types';
import { ConnectionManager } from './connections';
import { holdMatchingLock } from './matchingLock';

// Each in-flight row update holds one pooled connection for its transaction (see DB_POOL_MAX)
const ROW_UPDATE_CONCURRENCY = 12;
// Rematches of rows without a connection after others let go of some, in one run
const MAX_SETTLE_PASSES = 3;

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

	// Connections let go of during the current run in this process, by refCol. Another row may want
	// one, but is only rematched in this run if updateUnifiedTable rematches it.
	let releasedDuringRun: Map<string, Set<number>> | null = null;

	async function _updateRow({
		id,
		db,
		onUpdateCallback,
		nestedMode = false,
		removeAutoMatch = false,
		lostConnection
	}: {
		id: number;
		db: Tx | typeof DB;
		onUpdateCallback: OnUpdateCallback;
		nestedMode?: boolean;
		removeAutoMatch?: boolean;
		lostConnection?: LostConnection;
	}) {
		// Nested updates run inside a top-level one, which already holds it
		if (!nestedMode) await holdMatchingLock(db, unifiedTableName);
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
			lostConnection,
			originalRow,
			updatedRow,
			cellConfigurator,
			_updateRow
		});
		for (const refCol of connectionColumns) {
			const prev = originalRow[refCol as keyof RowType] as number | null;
			if (releasedDuringRun && prev !== null && updatedRow[refCol as keyof RowType] !== prev) {
				releasedDuringRun.set(refCol, (releasedDuringRun.get(refCol) ?? new Set()).add(prev));
			}
		}

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
		await PromisePool.withConcurrency(ROW_UPDATE_CONCURRENCY)
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

	/** The newest change to a source table, or null if it is empty */
	async function latestSourceUpdate(connection: AnyConnection) {
		const [res] = await DB.select({
			latest: sql<string | null>`max(${connection.table.lastUpdated})`
		}).from(connection.table as any);
		return res?.latest == null ? null : Number(res.latest);
	}

	/** Deletes rows with neither a primary nor a secondary connection, unless they have cell settings */
	async function deleteOrphans(onUpdateCallback: OnUpdateCallback) {
		if (!connections.secondaryTable) return;
		const orphans = await db
			.select({ id: table.id })
			.from(table as any)
			.where(
				and(
					isNull(table[connections.primaryTable.refCol as keyof UnifiedTables] as SQLWrapper),
					isNull(table[connections.secondaryTable.refCol as keyof UnifiedTables] as SQLWrapper)
				)
			);

		let deletedOrphans = 0;
		for (const item of orphans) {
			const uniId = (await getRow(item.id, db)).uniref.uniId;
			const cellConfig = await createCellConfigurator({
				table: confTable,
				unifiedTable: table,
				id: item.id,
				db,
				uniId,
				verifyCellValue: verifyCellValue
			});
			if (!cellConfig.hasAnyNonDefaultCellSettings) {
				await db.delete(table).where(eq(table.id, item.id));
				deletedOrphans++;
				onUpdateCallback(uniId);
			}
		}
		if (deletedOrphans > 0) {
			console.log(`Deleted ${deletedOrphans} orphaned unified rows from ${unifiedTableName}`);
		}
	}

	/**
	 * Rematches rows without a connection after other rows let go of some during the run, so a row
	 * that wants one gets it in this run rather than the next time that source changes. Primary
	 * rows let go of get new rows instead (step 1), and secondary rows nobody takes do in step 4.
	 */
	async function rematchReleasedConnections(
		progress: ((progress: number) => void) | undefined,
		onUpdateCallback: OnUpdateCallback
	) {
		for (let pass = 0; pass < MAX_SETTLE_PASSES && releasedDuringRun; pass++) {
			const released = releasedDuringRun;
			releasedDuringRun = new Map();
			const rowsToUpdate = new Set<number>();
			for (const [refCol, values] of released) {
				const connection = allConnections.find((c) => c.refCol === refCol);
				if (!connection || connection === connections.primaryTable) continue;
				const refColumn = table[refCol as keyof UnifiedTables] as SQLWrapper;
				// Already taken by another row, or deleted so no row can take it
				const free = await db
					.select({ id: connection.table.id })
					.from(connection.table as any)
					.leftJoin(table as UnifiedTables, eq(refColumn, connection.table.id))
					.where(
						and(
							inArray(connection.table.id, Array.from(values)),
							isNull(table.id),
							connection.allowDeleted ? undefined : eq(connection.table.deleted, false)
						)
					)
					.limit(1);
				if (free.length === 0) continue;
				const unconnected = await db
					.select({ id: table.id })
					.from(table as UnifiedTables)
					.where(isNull(refColumn));
				unconnected.forEach((r) => rowsToUpdate.add(r.id));
			}
			if (rowsToUpdate.size === 0) return;
			await _updateRows({ progress, onUpdateCallback, rowsToUpdate });
		}
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
		// Lets readers tell whether a run is in progress; runFinished is set to the same value. Waits
		// while matching is paused, so a reader holding the lock sees either no run or this one.
		const runStarted = newLastUpdated;
		await DB.transaction(async (tx) => {
			await holdMatchingLock(tx, unifiedTableName);
			await new KV('unifier/' + unifiedTableName, tx).set('runStarted', runStarted.toString());
		});
		const rematchedSources: string[] = [];

		// 0. Delete orphaned unified rows
		await deleteOrphans(onUpdateCallback);

		// 1. Add missing primary rows
		await _addMissingRows({ newLastUpdated, rowsToUpdate, connection: connections.primaryTable });

		// 2. Determine which rows need to be updated
		if (updateAll) {
			for (const sourceTable of allConnections) {
				const latest = await latestSourceUpdate(sourceTable);
				if (latest !== null) lastUpdatedBySource[sourceTable.refCol as string] = latest;
				rematchedSources.push(sourceTable.refCol as string);
			}
			const allRows = await db
				.select({ id: table.id })
				.from(table as UnifiedTables)
				.execute();
			allRows.forEach((v) => rowsToUpdate.add(v.id));
		} else {
			for (const sourceTable of allConnections) {
				const lastUpdated = lastUpdatedBySource[sourceTable.refCol as string] ?? 0;
				// Any change to the source can make new connections, including changes to rows that
				// are not connected to anything yet
				const latest = await latestSourceUpdate(sourceTable);
				if (latest === null || latest <= lastUpdated) continue;
				// Includes every row without a connection to this source
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
				rows.forEach((r) => rowsToUpdate.add(r.id!));
				lastUpdatedBySource[sourceTable.refCol as string] = latest;
				rematchedSources.push(sourceTable.refCol as string);
			}
		}

		releasedDuringRun = new Map();
		try {
			// 3. Update Rows
			await _updateRows({
				progress,
				onUpdateCallback,
				rowsToUpdate
			});
			// Before step 4, so rows with a primary connection get first pick of secondary rows
			await rematchReleasedConnections(progress, onUpdateCallback);

			// 4. Secondary Sources, including rows let go of while matching the ones just added
			if (connections.secondaryTable) {
				for (let pass = 0; pass < MAX_SETTLE_PASSES; pass++) {
					const secondaryRowsToUpdate = new Set<number>();
					await _addMissingRows({
						newLastUpdated,
						rowsToUpdate: secondaryRowsToUpdate,
						connection: connections.secondaryTable
					});
					if (secondaryRowsToUpdate.size === 0) break;
					await _updateRows({
						progress,
						onUpdateCallback,
						rowsToUpdate: secondaryRowsToUpdate
					});
					await rematchReleasedConnections(progress, onUpdateCallback);
				}
			}

			// Rows emptied during this run, so the next run starts settled
			await deleteOrphans(onUpdateCallback);
			const freedPrimaryRows = new Set<number>();
			await _addMissingRows({
				newLastUpdated,
				rowsToUpdate: freedPrimaryRows,
				connection: connections.primaryTable
			});
			if (freedPrimaryRows.size > 0) {
				await _updateRows({ progress, onUpdateCallback, rowsToUpdate: freedPrimaryRows });
			}
		} finally {
			releasedDuringRun = null;
		}

		// 5. Finish
		await retryableTransaction(
			async (db) => {
				const kv = new KV('unifier/' + unifiedTableName, db);
				const lastUpdatedNew = JSON.parse((await kv.get('lastUpdatedBySource')) ?? '{}');
				const newLastUpdated: { [key: string]: number } = {};
				const invalidatedDuringRun = new Set<string>();
				for (const k of Object.keys(lastUpdatedBySource)) {
					// recordMatchesInvalidatedByRefCol lowers the value (to 0 or below) during the run
					if (
						typeof lastUpdatedNew[k] === 'number' &&
						lastUpdatedNew[k] < (originalLastUpdatedBySource[k] ?? 2)
					) {
						newLastUpdated[k] = lastUpdatedNew[k];
						invalidatedDuringRun.add(k);
					} else {
						newLastUpdated[k] = lastUpdatedBySource[k];
					}
				}
				await kv.set('lastUpdatedBySource', JSON.stringify(newLastUpdated));
				await kv.set('version', version.toString());

				const unconnectedMatchedAt = JSON.parse((await kv.get('unconnectedMatchedAt')) ?? '{}');
				// Every row without a connection to these sources was matched against them after
				// runStarted, unless their matches were invalidated during the run
				for (const refCol of rematchedSources) {
					if (!invalidatedDuringRun.has(refCol)) unconnectedMatchedAt[refCol] = runStarted;
				}
				await kv.set('unconnectedMatchedAt', JSON.stringify(unconnectedMatchedAt));
				await kv.set('runFinished', runStarted.toString());
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

	/**
	 * Makes the next run match every row without a connection to this source, even if the source
	 * has not changed. Unlike recordMatchesInvalidatedByRefCol, connected rows are not rematched.
	 */
	async function requestUnconnectedRematch(refCol: string) {
		const connection = allConnections.find((c) => c.refCol === refCol);
		if (!connection) throw new Error(`${unifiedTableName} has no connection ${refCol}`);
		const latest = await latestSourceUpdate(connection);
		if (latest === null) return;
		await retryableTransaction(
			async (db) => {
				const kv = new KV('unifier/' + unifiedTableName, db);
				const lastUpdatedBySource = JSON.parse((await kv.get('lastUpdatedBySource')) ?? '{}');
				// Just below the newest source row, so only rows connected to that one are rematched too
				if ((lastUpdatedBySource[refCol] ?? 0) < latest) return;
				lastUpdatedBySource[refCol] = latest - 1;
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
		requestUnconnectedRematch,
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
