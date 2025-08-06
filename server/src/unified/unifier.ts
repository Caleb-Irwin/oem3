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
import { cellTransformer, createCellConfigurator, type CellConfigurator } from './cellConfigurator';
import type { NewError } from './errorManager';
import { retryableTransaction } from './retryableTransaction';
import PromisePool from '@supercharge/promise-pool';
import type {
	CellConfigTable,
	OtherSourceTables,
	PrimarySourceTables,
	UnifiedTables
} from './types';
import { VerifyCellValue } from './cellVerification';

export function createUnifier<
	RowType extends RowTypeBase<TableType>,
	TableType extends UnifiedTables
>(conf: CreateUnifierConf<RowType, TableType>) {
	const { table, confTable, getRow, transform, connections, version } = conf;

	const tableConf = getTableConfig(table),
		unifiedTableName = tableConf.name,
		connectionColumns = new Set(
			[connections.primaryTable, ...connections.otherTables].map((c) => c.refCol.toString())
		);

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

	const verifyCellValue = VerifyCellValue<RowType, TableType>(conf);

	async function _updateConnection({
		db,
		id,
		connectionTable,
		cellConfigurator,
		onUpdateCallback,
		updatedRow: updatedRowIn,
		originalRow,
		nestedMode,
		removeAutoMatch
	}: {
		db: Tx | typeof DB;
		id: number;
		connectionTable: ConnectionTable<RowType, TableType>;
		cellConfigurator: CellConfigurator;
		onUpdateCallback: OnUpdateCallback;
		updatedRow: RowType;
		originalRow: RowType;
		nestedMode: boolean;
		removeAutoMatch: boolean;
	}) {
		const updatedRow = structuredClone(updatedRowIn);
		const otherConnections = await connectionTable.findConnections(updatedRow, db);
		const connectionRowKey = connectionTable.refCol as keyof TableType['$inferInsert'];
		const isPrimary = !!(connectionTable as PrimaryTableConnection<any, any, any>)
			.newRowTransform as boolean;

		// Un-match the connection if it is deleted and not primary
		if (
			!isPrimary &&
			updatedRow[connectionRowKey] !== null &&
			(connectionTable.isDeleted(updatedRow) || removeAutoMatch)
		) {
			updatedRow[connectionRowKey] = null as any;
		}

		updatedRow[connectionRowKey] = (await cellConfigurator.getConfiguredCellValue(
			{
				key: connectionRowKey as any,
				val: updatedRow[connectionRowKey] as number,
				options: {}
			},
			originalRow[connectionRowKey] as number | null
		)) as any;

		async function findExistingConnection(db: Tx | typeof DB, value: number) {
			const existing = await db
				.select({ id: table.id, col: table[connectionRowKey as keyof TableType] as any })
				.from(table as any)
				.where(eq(table[connectionRowKey as keyof TableType] as any, value))
				.execute();
			return existing.length > 0 ? existing[0].id : null;
		}

		if (
			cellConfigurator.getCellSettings(connectionRowKey as any).setting === null &&
			otherConnections.length > 0 &&
			!removeAutoMatch
		) {
			if (updatedRow[connectionRowKey] === null) {
				updatedRow[connectionRowKey] = otherConnections[0] as any;
			}

			if (
				otherConnections.length > 1 ||
				(otherConnections.length === 1 && updatedRow[connectionRowKey] !== otherConnections[0])
			) {
				for (const connectionId of otherConnections) {
					const existing = await findExistingConnection(db, connectionId);
					if (!existing) {
						updatedRow[connectionRowKey] = connectionId as any;
						break;
					}
				}
				cellConfigurator.addError(connectionRowKey as any, {
					multipleOptions: {
						options: otherConnections.filter((v) => v !== updatedRow[connectionRowKey]),
						value: updatedRow[connectionRowKey] as any
					}
				});
			}
		}

		const newVal = updatedRow[connectionRowKey] as number | null;

		async function tryToUpdateRow(newId: number | null, onConflict: () => Promise<void>) {
			try {
				await db.transaction(async (tx) => {
					await _modifyRow(
						id,
						{
							[connectionRowKey]: newId
						} as any,
						tx
					);
				});
				return true;
			} catch (error: any) {
				if (error?.code === '23505') {
					await onConflict();
				} else {
					throw error;
				}
				return false;
			}
		}

		async function tryToRemoveConnection(newVal: number) {
			const existingId = await findExistingConnection(db, newVal);
			if (!existingId) {
				throw new Error(
					`No existing row found with the same connection value (${connectionRowKey.toString()}=${newVal})`
				);
			} else {
				return await db.transaction(async (tx) => {
					await _updateRow({ id: existingId, db: tx, onUpdateCallback, nestedMode: true });
					const deleted = await tx
						.select({ deleted: table.deleted })
						.from(table as any)
						.where(eq(table.id, existingId))
						.execute();
					if (deleted[0].deleted) {
						await _updateRow({
							id: existingId,
							db: tx,
							onUpdateCallback,
							nestedMode: true,
							removeAutoMatch: true
						});
						return true;
					}
					return false;
				});
			}
		}

		async function fallBackToNull() {
			if (!isPrimary && originalRow[connectionRowKey] !== null) {
				updatedRow[connectionRowKey] = null as any;
				await tryToUpdateRow(null, async () => {
					throw new Error('Failed to set null');
				});
			} else {
				updatedRow[connectionRowKey] = originalRow[connectionRowKey];
			}
			cellConfigurator.addError(connectionRowKey as any, {
				matchWouldCauseDuplicate: {
					value: newVal
				}
			});
		}

		if (originalRow[connectionRowKey] !== newVal) {
			await tryToUpdateRow(newVal, async () => {
				const removed = nestedMode ? false : await tryToRemoveConnection(newVal!);
				if (removed) {
					const success = await tryToUpdateRow(newVal, fallBackToNull);
					if (success) {
						await _updateRow({ id, db, onUpdateCallback, nestedMode: true });
					}
				} else {
					await fallBackToNull();
				}
			});
		}

		return { needsRowRefresh: updatedRow[connectionRowKey] !== originalRow[connectionRowKey] };
	}

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
		const cellConfigurator = await createCellConfigurator(
			confTable,
			id,
			originalRow.uniref.uniId,
			db,
			verifyCellValue
		);
		// 1. Check + make connections
		const connectionsList = [
			connections.primaryTable,
			/* Secondary, */
			...connections.otherTables
		];
		for (const connectionTable of connectionsList) {
			const { needsRowRefresh } = await _updateConnection({
				db,
				id,
				connectionTable,
				cellConfigurator,
				onUpdateCallback,
				updatedRow,
				originalRow,
				nestedMode,
				removeAutoMatch
			});
			if (needsRowRefresh) {
				updatedRow = await getRow(id, db);
			}
		}
		// 1.a Deleted item based on primary connection
		if (connections.primaryTable.isDeleted(updatedRow) && !updatedRow.deleted) {
			const newVal = (await cellConfigurator.getConfiguredCellValue(
				{
					key: 'deleted',
					val: true,
					options: {}
				},
				originalRow.deleted
			)) as boolean;
			if (newVal !== updatedRow.deleted) {
				updatedRow.deleted = newVal;
				await _modifyRow(id, { deleted: newVal } as any, db);
			}
		}

		// 2. Transform
		const transformed = transform(updatedRow, cellTransformer);

		// 3. Apply Overrides + Find Errors
		const changes: Partial<(typeof table)['$inferSelect']> = {};
		const changesToCommit: Partial<(typeof table)['$inferSelect']> = {};
		for (const k of Object.keys(transformed)) {
			if (k === 'id' || k === 'lastUpdated') continue;
			const key = k as keyof (typeof table)['$inferInsert'];
			const newVal = (await cellConfigurator.getConfiguredCellValue(
				transformed[k as keyof typeof transformed],
				originalRow[key] as any
			)) as any;
			if (originalRow[key] !== newVal) {
				if (!connectionColumns.has(key.toString())) {
					changesToCommit[key] = newVal;
				}
				changes[key] = newVal;
			}
		}

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
					data: changes,
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

	const kv = new KV('unifier/' + unifiedTableName, DB);

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
		const newLastUpdated = Date.now(),
			lastUpdatedBySource: { [key: string]: number } = JSON.parse(
				(await kv.get('lastUpdatedBySource')) ?? '{}'
			),
			rowsToUpdate = new Set<number>();
		if (parseInt((await kv.get('version')) ?? '-1') < version) {
			updateAll = true;
		}

		// 1. Add missing primary rows
		await DB.transaction(async (db) => {
			const missingPrimaryRows = await db
				.select()
				.from(connections.primaryTable.table)
				.leftJoin(
					table as UnifiedTables,
					eq(
						connections.primaryTable.table.id,
						table[connections.primaryTable.refCol] as SQLWrapper
					)
				)
				.where(isNull(table.id))
				.execute();
			const primaryTableName = getTableConfig(connections.primaryTable.table).name;
			const rowsToInsert = missingPrimaryRows.map((v) =>
				connections.primaryTable.newRowTransform(
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
						data: v,
						created: newLastUpdated
					}))
				});
			}
		});

		// 2. Determine which rows need to be updated
		if (updateAll) {
			const allRows = await db
				.select({ id: table.id })
				.from(table as UnifiedTables)
				.execute();
			allRows.forEach((v) => rowsToUpdate.add(v.id));
		} else {
			const sourceTables = [connections.primaryTable, ...connections.otherTables];
			for (const sourceTable of sourceTables) {
				const lastUpdated = lastUpdatedBySource[sourceTable.refCol as string] ?? 0;
				const rows = await db
					.select({ id: table.id, lastUpdated: sourceTable.table.lastUpdated })
					.from(table as UnifiedTables)
					.leftJoin(
						sourceTable.table,
						eq(table[sourceTable.refCol] as SQLWrapper, sourceTable.table.id)
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
					rows.forEach((r) => rowsToUpdate.add(r.id));
			}
		}

		// 3. Update Rows
		if (progress) progress(0);
		let done = 0;
		await PromisePool.withConcurrency(25)
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

		// 4. Finish
		await kv.set('lastUpdatedBySource', JSON.stringify(lastUpdatedBySource));
		await kv.set('version', version.toString());
	}

	async function recordMatchesInvalidatedByRefCol(refCol: string) {
		const lastUpdatedBySource = JSON.parse((await kv.get('lastUpdatedBySource')) ?? '{}');
		lastUpdatedBySource[refCol] = 0;
		await kv.set('lastUpdatedBySource', JSON.stringify(lastUpdatedBySource));
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
	TableType extends UnifiedTables
> = ReturnType<typeof createUnifier<RowType, TableType>>;

export interface CreateUnifierConf<
	RowType extends RowTypeBase<TableType>,
	TableType extends UnifiedTables
> {
	table: TableType;
	confTable: CellConfigTable;
	getRow: (id: number, db: Tx | typeof DB) => Promise<RowType>;
	transform: (
		item: RowType,
		t: typeof cellTransformer
	) => {
		[K in keyof TableType['$inferSelect']]: ReturnType<typeof cellTransformer>;
	};
	connections: Connections<RowType, TableType>;
	additionalColValidators: AdditionalColValidator<TableType>;
	version: number;
}

export type RowTypeBase<TableType extends UnifiedTables> = TableType['$inferSelect'] & {
	uniref: { uniId: number };
	id: number;
	deleted: boolean;
};

type ConnectionTable<RowType, TableType extends UnifiedTables> =
	| PrimaryTableConnection<RowType, TableType, PrimarySourceTables>
	| TableConnection<RowType, TableType, OtherSourceTables>;

interface TableConnection<
	RowType,
	UnifiedTable extends UnifiedTables,
	T extends PrimarySourceTables | OtherSourceTables
> {
	table: T;
	refCol: keyof UnifiedTable;
	findConnections: (row: RowType, db: typeof DB | Tx) => Promise<number[]>; // Should not return deleted items
	isDeleted: (row: RowType) => boolean;
}

interface PrimaryTableConnection<
	RowType,
	UnifiedTable extends UnifiedTables,
	T extends PrimarySourceTables
> extends TableConnection<RowType, UnifiedTable, T> {
	newRowTransform: (row: T['$inferSelect'], lastUpdated: number) => UnifiedTable['$inferInsert'];
}

interface Connections<RowType, UnifiedTable extends UnifiedTables> {
	primaryTable: PrimaryTableConnection<RowType, UnifiedTable, PrimarySourceTables>;
	// secondaryTable?: TableConnections<RowType, SecondarySourceTables>;
	otherTables: TableConnection<RowType, UnifiedTable, OtherSourceTables>[];
}

type AdditionalColValidator<TableType extends UnifiedTables> = {
	[K in keyof TableType['$inferSelect']]?: (
		value: TableType['$inferSelect'][K],
		db: typeof DB | Tx
	) => NewError | undefined | void | Promise<NewError | undefined | void>;
};

export type VerifyCellValue = ReturnType<typeof createUnifier>['verifyCellValue'];

type OnUpdateCallback = (uniId: number) => void;
