import {
	guildData,
	guildFlyer,
	guildInventory,
	unifiedGuild,
	unifiedGuildCellConfig,
	uniref
} from '../db.schema';
import { db, db as DB, type Tx } from '../db';
import { eq, isNull, type SQLWrapper, gt, or } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { chunk } from './chunk';
import { insertHistory, insertMultipleHistoryRows, type InsertHistoryRowOptions } from './history';
import { KV } from './kv';
import { cellTransformer, createCellConfigurator, type NewError } from './cellConfigurator';
import { retryableTransaction } from './retryableTransaction';
import PromisePool from '@supercharge/promise-pool';

export function createUnifier<
	RowType extends TableType['$inferSelect'] & {
		uniref: { uniId: number };
		id: number;
		deleted: boolean;
	},
	TableType extends UnifiedTables
>({
	table,
	confTable,
	getRow,
	transform,
	connections,
	additionalColValidators,
	version
}: {
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
}) {
	const tableConf = getTableConfig(table),
		unifiedTableName = tableConf.name,
		colTypes = getColConfig(table);

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

	async function verifyCellValue<K extends keyof TableType['$inferSelect']>({
		value: rawValue,
		col,
		db,
		verifyConnections = false
	}: {
		value: TableType['$inferSelect'][K] | string;
		col: K;
		db: typeof DB | Tx;
		verifyConnections?: boolean;
	}): Promise<
		| {
				err: NewError;
				coercedValue?: null;
		  }
		| {
				err: null;
				coercedValue: TableType['$inferSelect'][K];
		  }
	> {
		const dataType = colTypes[col].dataType,
			notNull = colTypes[col].notNull;

		let value: TableType['$inferSelect'][K] | null = rawValue as
			| TableType['$inferSelect'][K]
			| null;
		if (typeof rawValue === 'string') {
			if (rawValue.toLowerCase() === 'null') {
				value = null;
			} else if (dataType === 'number' && rawValue && !isNaN(parseFloat(rawValue))) {
				value = parseFloat(rawValue) as TableType['$inferSelect'][K];
			} else if (dataType === 'boolean') {
				value = (rawValue.toLowerCase() === 'true') as TableType['$inferSelect'][K];
			}
		}

		if (value === null && notNull) {
			return {
				err: {
					canNotBeSetToNull: {
						message: `Value "${value}" is null but must not be null; This is not allowed. It should be set to a "${dataType}" value.`
					}
				}
			};
		} else if (value !== null && typeof value !== dataType) {
			return {
				err: {
					canNotBeSetToWrongType: {
						value: value as 'string' | 'number' | 'boolean',
						message: `Value "${value}" is of type "${typeof value}" but must be of type "${dataType}"; This is not allowed.`
					}
				}
			};
		} else if (value !== null) {
			const additionalValidator = additionalColValidators[col];
			if (additionalValidator) {
				const error = await additionalValidator(value, db);
				if (error) {
					return { err: error };
				}
			}
			if (verifyConnections) {
				const connectionTable = [connections.primaryTable, ...connections.otherTables].find(
					(c) => c.refCol === col
				);
				if (connectionTable) {
					const exists = await db
						.select({ id: table.id })
						.from(connectionTable.table)
						.where(eq(connectionTable.table.id, value as number));
					if (exists.length === 0) {
						return {
							err: {
								invalidDataType: {
									value: value as number,
									message: `Value "${value}" is not a valid ID in the connected table. Hint: Use the search function to select connection.`
								}
							}
						};
					}
				}
			}
		}
		return { err: null, coercedValue: value as TableType['$inferSelect'][K] };
	}

	async function _updateRow({
		id,
		db,
		onUpdateCallback
	}: {
		id: number;
		db: Tx | typeof DB;
		onUpdateCallback: OnUpdateCallback;
	}) {
		const originalRow = await getRow(id, db);
		let updatedRow = structuredClone(originalRow);
		const cellConfigurator = await createCellConfigurator(
			confTable,
			id,
			originalRow.uniref.uniId,
			db
		);
		// 1. Check + make connections
		const connectionsList = [
			connections.primaryTable,
			/* Secondary, */
			...connections.otherTables
		];
		for (const connectionTable of connectionsList) {
			const otherConnections = await connectionTable.findConnections(updatedRow, db);
			const connectionRowKey = connectionTable.refCol as keyof TableType['$inferInsert'];

			// Un-match the connection if it is deleted and not primary
			if (
				!(connectionTable as PrimaryTableConnection<any, any, any>).newRowTransform &&
				updatedRow[connectionRowKey] !== null &&
				connectionTable.isDeleted(updatedRow)
			) {
				updatedRow[connectionRowKey] = null as any;
			}

			// Apply custom settings first before automatic connection assignment
			const configuredVal = await cellConfigurator.getConfiguredCellValue(
				{
					key: connectionRowKey as any,
					val: updatedRow[connectionRowKey] as number,
					options: {}
				},
				originalRow[connectionRowKey] as number | null,
				verifyCellValue
			);

			// Only auto-assign connection if no custom setting was applied
			if (configuredVal === updatedRow[connectionRowKey] && otherConnections.length > 0) {
				if (updatedRow[connectionRowKey] === null) {
					updatedRow[connectionRowKey] = otherConnections[0] as any;
				}

				if (
					otherConnections.length > 1 ||
					(otherConnections.length === 1 && updatedRow[connectionRowKey] !== otherConnections[0])
				) {
					cellConfigurator.addError(connectionRowKey as any, {
						multipleOptions: {
							options: otherConnections.filter((v) => v !== updatedRow[connectionRowKey]),
							value: updatedRow[connectionRowKey] as any
						}
					});
				}
			} else {
				updatedRow[connectionRowKey] = configuredVal as any;
			}

			const newVal = updatedRow[connectionRowKey] as number | null;
			if (originalRow[connectionRowKey] !== newVal) {
				try {
					await db.transaction(async (tx) => {
						await _modifyRow(
							id,
							{
								[connectionRowKey]: newVal
							} as any,
							tx
						);
						updatedRow = await getRow(id, tx);
					});
				} catch (error: any) {
					if (error?.code === '23505') {
						updatedRow[connectionRowKey] = originalRow[connectionRowKey];
						cellConfigurator.addError(connectionRowKey as any, {
							matchWouldCauseDuplicate: {
								value: newVal
							}
						});
					} else {
						throw error;
					}
				}
			}
		}
		if (connections.primaryTable.isDeleted(updatedRow) && !updatedRow.deleted) {
			const newVal = (await cellConfigurator.getConfiguredCellValue(
				{
					key: 'deleted',
					val: true,
					options: {}
				},
				originalRow.deleted,
				verifyCellValue
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
		for (const k of Object.keys(transformed)) {
			if (k === 'id' || k === 'lastUpdated') continue;
			const key = k as keyof (typeof table)['$inferInsert'];
			const newVal = (await cellConfigurator.getConfiguredCellValue(
				transformed[k as keyof typeof transformed],
				originalRow[key] as any,
				verifyCellValue
			)) as any;
			if (originalRow[key] !== newVal) {
				changes[key] = newVal;
			}
		}

		const { errorsToAdd, errorsToRemove } = await cellConfigurator.commitErrors();
		const hasChanges = Object.keys(changes).length > 0;

		// 4. Update Row
		const time = Date.now();
		if (hasChanges) await _modifyRow(id, { lastUpdated: time, ...changes }, db);

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
		const kv = new KV('unifier/' + unifiedTableName, DB),
			newLastUpdated = Date.now(),
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

	return {
		updateUnifiedTable,
		updateRow,
		_updateRow,
		verifyCellValue
	};
}

export function getColConfig<TableType extends UnifiedTables>(table: TableType) {
	const tableConf = getTableConfig(table),
		colTypes = {} as Record<
			keyof TableType['$inferSelect'],
			{ dataType: 'string' | 'number' | 'boolean'; notNull: boolean }
		>;
	tableConf.columns.forEach(({ name, dataType, notNull }) => {
		colTypes[name as keyof TableType['$inferSelect']] = {
			dataType: dataType as 'string' | 'number' | 'boolean',
			notNull
		};
	});
	return colTypes;
}

export type UnifiedTables = typeof unifiedGuild;
export const UnifiedTableNamesArray = ['unifiedGuild'] as const;
export type UnifiedTableNames = (typeof UnifiedTableNamesArray)[number];
export type PrimarySourceTables = typeof unifiedGuild | typeof guildData;
// export type SecondarySourceTables = typeof unifiedSPR
export type OtherSourceTables = typeof guildInventory | typeof guildFlyer;

export type CellConfigTable = typeof unifiedGuildCellConfig;

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
