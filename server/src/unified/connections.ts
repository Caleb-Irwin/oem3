import { and, eq, sql } from 'drizzle-orm';
import { db as DB, type Tx } from '../db';
import type { CellConfigurator } from './cellConfigurator';
import type {
	_UpdateRow,
	AnyConnection,
	CellConfigTable,
	LostConnection,
	OtherSourceTables,
	PrimarySourceTables,
	SecondarySourceTables,
	UnifiedTables
} from './types';
import type { CreateUnifierConf, OnUpdateCallback, RowTypeBase } from './unifier';
import { getPgErrorCode } from '../utils/dbErrors';

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
	const { connections, getRow, table, confTable } = conf;

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
			if (getPgErrorCode(error) === '23505') {
				await onConflict();
			} else {
				throw error;
			}
			return false;
		}
	}

	/** The row holding a connection, if any */
	async function findHolder(db: Tx | typeof DB, connectionRowKey: keyof RowType, value: number) {
		const existing = await db
			.select({ id: table.id })
			.from(table as any)
			.where(eq(table[connectionRowKey as keyof TableType] as any, value))
			.execute();
		return existing.length > 0 ? existing[0].id : null;
	}

	/**
	 * How strongly a row claims a connection, compared when two rows want the same one. A manual
	 * match beats an automatic one, then a row with live source data (other than this connection)
	 * beats one without, then a row with a primary connection beats one without. None of these
	 * depend on who holds the connection, so a conflict is decided the same way however often it
	 * comes up; with equal claims the holder keeps it.
	 */
	function claimRank(row: RowType, connectionRowKey: keyof RowType, manual: boolean) {
		const hasConnection = (c: AnyConnection | null): c is AnyConnection =>
			c !== null && c.refCol !== connectionRowKey && row[c.refCol as keyof RowType] !== null;
		const live = [connections.primaryTable, connections.secondaryTable].some(
			(c) => hasConnection(c) && !c.isDeleted(row)
		);
		return (manual ? 4 : 0) + (live ? 2 : 0) + (hasConnection(connections.primaryTable) ? 1 : 0);
	}

	async function holderClaimRank(
		db: Tx | typeof DB,
		holderId: number,
		connectionRowKey: keyof RowType
	) {
		const holder = await getRow(holderId, db);
		const settings = await db
			.select({ col: confTable.col, isDefaultSetting: confTable.isDefaultSetting })
			.from(confTable as CellConfigTable)
			.where(and(eq(confTable.refId, holderId), sql`${confTable.confType}::text like 'setting:%'`));
		return {
			holder,
			rank: claimRank(
				holder,
				connectionRowKey,
				settings.some((s) => s.col === connectionRowKey)
			),
			hasCellSettings: settings.some((s) => !s.isDefaultSetting)
		};
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
		lostConnection,
		_updateRow,
		allowRemoveMatch,
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
		lostConnection: LostConnection | undefined;
		_updateRow: _UpdateRow;
		allowRemoveMatch: boolean;
		conType: 'primary' | 'secondary' | 'other';
	}) {
		const updatedRow = structuredClone(updatedRowIn);
		const otherConnections = await connectionTable.findConnections(updatedRow, db);
		const connectionRowKey = connectionTable.refCol as keyof TableType['$inferInsert'];
		// Taken by a row with a stronger claim, so this row must not take it back
		const lostValue =
			lostConnection?.refCol === connectionRowKey ? lostConnection.value : (null as number | null);

		// Un-match the connection if it is deleted and not primary
		if (
			allowRemoveMatch &&
			((connectionTable.isDeleted(updatedRow) && !connectionTable.allowDeleted) ||
				removeAutoMatch ||
				(lostValue !== null && updatedRow[connectionRowKey] === lostValue))
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

		const isManual = cellConfigurator.getCellSettings(connectionRowKey as any).setting !== null;

		/** Whether this row's claim beats the holder's (see claimRank) */
		async function outranksHolder(holderId: number) {
			const { rank } = await holderClaimRank(db, holderId, connectionRowKey);
			return claimRank(updatedRow, connectionRowKey, isManual) > rank;
		}

		/**
		 * One of several options: a free one, else one held by a row with a weaker claim, else the
		 * first (trying it adds the error explaining why it was not matched)
		 */
		async function chooseOption(options: number[]) {
			let outranked: number | null = null;
			for (const option of options) {
				if (option === lostValue) continue;
				const holderId = await findHolder(db, connectionRowKey, option);
				if (holderId === null || holderId === id) return option;
				if (outranked === null && conType !== 'primary' && (await outranksHolder(holderId)))
					outranked = option;
			}
			return outranked ?? options[0];
		}

		if (!isManual && !removeAutoMatch) {
			// Ensure previous value is a valid auto match and if not remove it
			if (
				updatedRow[connectionRowKey] !== null &&
				!otherConnections.includes(updatedRow[connectionRowKey] as number) &&
				allowRemoveMatch
			) {
				updatedRow[connectionRowKey] = null as any;
			}

			// Auto match if possible or remove if not. A row keeps a connection that still matches, so
			// it never hops between equally good options.
			if (otherConnections.length > 0 && updatedRow[connectionRowKey] === null) {
				updatedRow[connectionRowKey] = (
					otherConnections.length === 1 ? otherConnections[0] : await chooseOption(otherConnections)
				) as any;
			} else if (otherConnections.length === 0 && allowRemoveMatch) {
				updatedRow[connectionRowKey] = null as any;
			}

			if (otherConnections.length > 1) {
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

		/**
		 * Re-evaluates the row holding the connection, then takes the connection from it if this row
		 * has the stronger claim. Returns whether the connection is free to take.
		 */
		async function takeFromHolder(value: number) {
			const holderId = await findHolder(db, connectionRowKey, value);
			// Let go of since the conflict
			if (holderId === null) return true;
			return await db.transaction(async (tx) => {
				await _updateRow({ id: holderId, db: tx, onUpdateCallback, nestedMode: true });
				const [existing] = await tx
					.select({ connection: table[connectionRowKey as keyof TableType] as any })
					.from(table as any)
					.where(eq(table.id, holderId))
					.execute();
				// Re-evaluating the other row can make it let go of the connection by itself
				if (existing?.connection !== value) return true;
				// A row's primary connection is what it was made from, so it is never taken
				if (conType === 'primary') return false;
				const { holder, rank, hasCellSettings } = await holderClaimRank(
					tx,
					holderId,
					connectionRowKey
				);
				if (claimRank(updatedRow, connectionRowKey, isManual) <= rank) return false;
				if (
					conType === 'secondary' &&
					holder[connections.primaryTable.refCol as keyof RowType] === null
				) {
					// Cell settings keep a row that would be left with no connections
					if (hasCellSettings) return false;
					// The secondary connection is all the holder is made of, so it lets go of everything
					// and is deleted as an orphan
					await _updateRow({
						id: holderId,
						db: tx,
						onUpdateCallback,
						nestedMode: true,
						removeAutoMatch: true
					});
				} else {
					// The holder only loses this connection, and is told not to take it back
					await _updateRow({
						id: holderId,
						db: tx,
						onUpdateCallback,
						nestedMode: true,
						lostConnection: { refCol: connectionRowKey as string, value }
					});
				}
				return true;
			});
		}

		async function fallBackToNull() {
			if (allowRemoveMatch && originalRow[connectionRowKey] !== null) {
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
					value: newVal,
					message:
						conType === 'secondary'
							? 'To allow this match, either unmatch this item from its current connection, or IF IT LACKS A PRIMARY CONNECTION, remove all cell settings.'
							: undefined
				}
			});
		}

		if (!allowRemoveMatch && newVal === null && originalRow[connectionRowKey] !== null) {
			cellConfigurator.addError(connectionRowKey as any, {
				canNotBeSetToNull: {
					message:
						conType === 'primary'
							? `Primary connections can never be removed.`
							: `Secondary connections can only be removed if the item has a primary connection or if the connection is being connection to a new item with a primary connection.`
				}
			});
		} else if (newVal !== null && newVal === lostValue) {
			// Its only option, now held by a row with a stronger claim
			await fallBackToNull();
		} else if (originalRow[connectionRowKey] !== newVal) {
			await tryToUpdateRow({
				newConnectionId: newVal,
				id: originalRow.id,
				connectionRowKey,
				db,
				onConflict: async () => {
					const free = nestedMode ? false : await takeFromHolder(newVal!);
					if (free) {
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
		lostConnection,
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
		lostConnection: LostConnection | undefined;
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
			lostConnection,
			_updateRow
		};

		const { needsRowRefresh } = await updateConnection({
			...base,
			connectionTable: connections.primaryTable,
			updatedRow,
			allowRemoveMatch: false,
			conType: 'primary'
		});
		if (needsRowRefresh) {
			updatedRow = await getRow(id, db);
		}

		if (connections.secondaryTable) {
			const hasPrimaryConnection =
				updatedRow[connections.primaryTable.refCol as keyof RowType] !== null;

			const rowHasCellSettings = cellConfigurator.hasAnyNonDefaultCellSettings;

			const { needsRowRefresh: needsRowRefreshSecondary } = await updateConnection({
				...base,
				connectionTable: connections.secondaryTable,
				updatedRow,
				allowRemoveMatch:
					hasPrimaryConnection || (!hasPrimaryConnection && removeAutoMatch && !rowHasCellSettings),
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
				allowRemoveMatch: true,
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
