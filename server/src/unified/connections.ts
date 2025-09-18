import { eq } from 'drizzle-orm';
import { db as DB, type Tx } from '../db';
import type { CellConfigurator } from './cellConfigurator';
import type {
	_UpdateRow,
	AnyConnection,
	CellConfigTable,
	OtherSourceTables,
	PrimarySourceTables,
	SecondarySourceTables,
	UnifiedTables
} from './types';
import type { CreateUnifierConf, OnUpdateCallback, RowTypeBase } from './unifier';

export function ConnectionManager<
	RowType extends RowTypeBase<TableType>,
	TableType extends UnifiedTables,
	CellConfTable extends CellConfigTable,
	Primary extends PrimarySourceTables,
	Other extends OtherSourceTables,
	Secondary extends SecondarySourceTables | null = null
>({
	conf,
	_modifyRow
}: {
	conf: CreateUnifierConf<RowType, TableType, CellConfTable, Primary, Other, Secondary>;
	_modifyRow: (
		id: number,
		row: Partial<TableType['$inferInsert']>,
		db: Tx | typeof DB
	) => Promise<void>;
}) {
	const { connections, getRow, table } = conf;

	async function tryToUpdateRow({
		id,
		newConnectionId: newId,
		onConflict,
		db,
		connectionRowKey
	}: {
		id: number;
		newConnectionId: number | null;
		connectionRowKey: string | number | symbol;
		onConflict: () => Promise<void>;
		db: typeof DB | Tx;
	}) {
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

	async function updateConnection({
		db,
		id,
		connectionTable,
		cellConfigurator,
		onUpdateCallback,
		updatedRow: updatedRowIn,
		originalRow,
		nestedMode,
		removeAutoMatch,
		_updateRow,
		conType
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
		_updateRow: _UpdateRow;
		conType: 'primary' | 'secondary' | 'other';
	}) {
		const updatedRow = structuredClone(updatedRowIn);
		const otherConnections = await connectionTable.findConnections(updatedRow, db);
		const connectionRowKey = connectionTable.refCol as keyof TableType['$inferInsert'];
		const isPrimarySecondary = conType !== 'other';

		// Un-match the connection if it is deleted and not primary
		if (
			!isPrimarySecondary &&
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
				!isPrimarySecondary
			) {
				updatedRow[connectionRowKey] = null as any;
			}

			// Auto match if possible or remove if not
			if (otherConnections.length > 0 && updatedRow[connectionRowKey] === null) {
				updatedRow[connectionRowKey] = otherConnections[0] as any;
			} else if (otherConnections.length === 0 && !isPrimarySecondary) {
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
			if (!isPrimarySecondary && originalRow[connectionRowKey] !== null) {
				updatedRow[connectionRowKey] = null as any;
				await tryToUpdateRow({
					id: originalRow.id,
					newConnectionId: null,
					onConflict: async () => {
						throw new Error('Failed to set null');
					},
					db,
					connectionRowKey
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
			await tryToUpdateRow({
				newConnectionId: newVal,
				id: originalRow.id,
				connectionRowKey,
				db,
				onConflict: async () => {
					const removed = nestedMode ? false : await tryToRemoveConnection(newVal!);
					if (removed) {
						const success = await tryToUpdateRow({
							id: originalRow.id,
							newConnectionId: newVal,
							onConflict: fallBackToNull,
							db,
							connectionRowKey
						});
						if (success) {
							await _updateRow({ id, db, onUpdateCallback, nestedMode: true });
						}
					} else {
						await fallBackToNull();
					}
				}
			});
		}

		return { needsRowRefresh: updatedRow[connectionRowKey] !== originalRow[connectionRowKey] };
	}

	async function updateConnections({
		db,
		id,
		onUpdateCallback,
		nestedMode,
		removeAutoMatch,
		originalRow,
		updatedRow,
		cellConfigurator,
		_updateRow
	}: {
		db: Tx | typeof DB;
		id: number;
		onUpdateCallback: OnUpdateCallback;
		nestedMode: boolean;
		removeAutoMatch: boolean;
		originalRow: RowType;
		updatedRow: RowType;
		cellConfigurator: CellConfigurator;
		_updateRow: _UpdateRow;
	}) {
		const base = {
			db,
			id,
			cellConfigurator,
			onUpdateCallback,
			originalRow,
			nestedMode,
			removeAutoMatch,
			_updateRow
		};

		const { needsRowRefresh } = await updateConnection({
			...base,
			connectionTable: connections.primaryTable,
			updatedRow,
			conType: 'primary'
		});
		if (needsRowRefresh) {
			updatedRow = await getRow(id, db);
		}

		if (connections.secondaryTable) {
			const { needsRowRefresh: needsRowRefreshSecondary } = await updateConnection({
				...base,
				connectionTable: connections.secondaryTable,
				updatedRow,
				conType: 'secondary'
			});
			if (needsRowRefreshSecondary) {
				updatedRow = await getRow(id, db);
			}
		}

		for (const connectionTable of connections.otherTables) {
			const { needsRowRefresh } = await updateConnection({
				...base,
				updatedRow,
				connectionTable,
				conType: 'other'
			});
			if (needsRowRefresh) {
				updatedRow = await getRow(id, db);
			}
		}
		return updatedRow;
	}

	return {
		updateConnections
	};
}
