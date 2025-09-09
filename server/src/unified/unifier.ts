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
	SecondarySourceTables,
	UnifiedTables
} from './types';
import { VerifyCellValue } from './cellVerification';

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

	type AnyConnection =
		| PrimarySecondaryTableConnection<RowType, TableType, Primary>
		| TableConnection<RowType, TableType, Other>
		| PrimarySecondaryTableConnection<RowType, TableType, SecondarySourceTables>;
	const allConnections: AnyConnection[] = [connections.primaryTable, ...connections.otherTables];
	if (connections.secondaryTable) {
		allConnections.push(connections.secondaryTable);
	}

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
		connectionTable: AnyConnection;
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
		const isPrimary = 'newRowTransform' in connectionTable;

		// Un-match the connection if it is deleted and not primary
		if (
			!isPrimary &&
			((connectionTable.isDeleted(updatedRow) && !connectionTable.allowDeleted) || removeAutoMatch)
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
			!removeAutoMatch
		) {
			// Ensure previous event is a valid auto match and if not remove it
			if (
				updatedRow[connectionRowKey] !== null &&
				!otherConnections.includes(updatedRow[connectionRowKey] as number) &&
				!isPrimary
			) {
				updatedRow[connectionRowKey] = null as any;
			}

			// Auto match if possible or remove if not
			if (otherConnections.length > 0 && updatedRow[connectionRowKey] === null) {
				updatedRow[connectionRowKey] = otherConnections[0] as any;
			} else if (otherConnections.length === 0 && !isPrimary) {
				updatedRow[connectionRowKey] = null as any;
			}

			// Deal with multiple auto connection options
			if (otherConnections.length > 1) {
				for (const connectionId of otherConnections) {
					const existing = await findExistingConnection(db, connectionId);
					if (!existing) {
						updatedRow[connectionRowKey] = connectionId as any;
						break;
					}
				}
				cellConfigurator.addError(connectionRowKey as any, {
					multipleOptions: {
						options: otherConnections.filter(
							(v: number) => v !== (updatedRow[connectionRowKey] as unknown as number | null)
						),
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
		const cellConfigurator = await createCellConfigurator({
			table: confTable,
			unifiedTable: table,
			id,
			uniId: originalRow.uniref.uniId,
			db,
			verifyCellValue
		});
		// 1. Check + make connections

		for (const connectionTable of allConnections) {
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
		await DB.transaction(async (db) => {
			const missingPrimaryRows = await db
				.select()
				.from(connections.primaryTable.table as any)
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
						data: v as any,
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
			for (const sourceTable of allConnections) {
				const lastUpdated = lastUpdatedBySource[sourceTable.refCol as string] ?? 0;
				const rows = await db
					.select({ id: table.id, lastUpdated: sourceTable.table.lastUpdated })
					.from(table as UnifiedTables)
					.leftJoin(
						sourceTable.table as any,
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
					rows.forEach((r) => rowsToUpdate.add(r.id!));
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

export type ConnectionTable<
	RowType,
	TableType extends UnifiedTables,
	Primary extends PrimarySourceTables = PrimarySourceTables,
	Other extends OtherSourceTables = OtherSourceTables,
	Secondary extends SecondarySourceTables | null = null
> =
	| PrimarySecondaryTableConnection<RowType, TableType, Primary>
	| TableConnection<RowType, TableType, Other>
	| (Secondary extends SecondarySourceTables
			? PrimarySecondaryTableConnection<RowType, TableType, Secondary>
			: never);

export interface TableConnection<
	RowType,
	UnifiedTable extends UnifiedTables,
	T extends PrimarySourceTables | OtherSourceTables
> {
	table: T;
	refCol: keyof UnifiedTable;
	findConnections: (row: RowType, db: typeof DB | Tx) => Promise<number[]>; // Should not return deleted items
	isDeleted: (row: RowType) => boolean;
	allowDeleted?: boolean;
}

interface PrimarySecondaryTableConnection<
	RowType,
	UnifiedTable extends UnifiedTables,
	T extends PrimarySourceTables | SecondarySourceTables
> extends TableConnection<RowType, UnifiedTable, T> {
	newRowTransform: (row: T['$inferSelect'], lastUpdated: number) => UnifiedTable['$inferInsert'];
}

interface Connections<
	RowType,
	UnifiedTable extends UnifiedTables,
	Primary extends PrimarySourceTables = PrimarySourceTables,
	Secondary extends SecondarySourceTables | null = null,
	Other extends OtherSourceTables = OtherSourceTables
> {
	primaryTable: PrimarySecondaryTableConnection<RowType, UnifiedTable, Primary>;
	secondaryTable: Secondary extends SecondarySourceTables
		? PrimarySecondaryTableConnection<RowType, UnifiedTable, Secondary>
		: null;
	otherTables: TableConnection<RowType, UnifiedTable, Other>[];
}

type AdditionalColValidator<TableType extends UnifiedTables> = {
	[K in keyof TableType['$inferSelect']]?: (
		value: TableType['$inferSelect'][K],
		db: typeof DB | Tx
	) => NewError | undefined | void | Promise<NewError | undefined | void>;
};

export type OnUpdateCallback = (uniId: number) => void;
