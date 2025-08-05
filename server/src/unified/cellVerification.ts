import { eq } from 'drizzle-orm';
import type { NewError } from './errorManager';
import { db as DB, type Tx } from '../db';
import type { UnifiedTables } from './types';
import { getTableConfig } from 'drizzle-orm/pg-core';
import type { CreateUnifierConf, RowTypeBase } from './unifier';

export function VerifyCellValue<
	RowType extends RowTypeBase<TableType>,
	TableType extends UnifiedTables
>({ table, additionalColValidators, connections }: CreateUnifierConf<RowType, TableType>) {
	const colTypes = getColConfig(table);

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

	return verifyCellValue;
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
