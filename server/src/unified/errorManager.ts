import { inArray } from 'drizzle-orm';
import { db as DB, type Tx } from '../db';
import { insertMultipleHistoryRows, type InsertHistoryRowOptions } from '../utils/history';
import type { CellConfigTable, CellConfigRowInsert, CellConfigRowSelect } from './types';

export function createErrorManager(
	db: typeof DB | Tx,
	table: CellConfigTable,
	id: number,
	uniId: number,
	cellConfigs: CellConfigRowSelect[]
) {
	const newErrors: CellConfigRowInsert[] = [];

	function addError(col: (typeof table)['$inferSelect']['col'], error: NewError, notes?: string) {
		const errorType = Object.keys(error)[0] as keyof NewError;
		const errorData = error[errorType] as NewErrorMerged;
		newErrors.push({
			refId: id,
			confType: `error:${errorType}` as any,
			col,
			message: errorData.message ?? null,
			value:
				errorData.value !== undefined && errorData.value !== null ? String(errorData.value) : null,
			lastValue:
				errorData.lastValue !== undefined && errorData.lastValue !== null
					? String(errorData.lastValue)
					: null,
			options: errorData.options ? JSON.stringify(errorData.options) : null,
			resolved: false,
			notes,
			created: Date.now()
		});
	}

	async function commitErrors() {
		const existingErrors = cellConfigs.filter((c) => c.confType.startsWith('error:'));
		const errorsToRemove = new Set<number>(
			existingErrors.filter((c) => c.resolved === false).map((c) => c.id)
		);
		const errorsToAdd = newErrors.filter((newError) => {
			const existingError = findMatchingError(existingErrors, newError);
			if (existingError?.id) {
				errorsToRemove.delete(existingError.id);
				return false;
			}
			return true;
		});

		const historyRows: InsertHistoryRowOptions<{}>[] = [];
		const time = Date.now();

		if (errorsToRemove.size > 0) {
			const removedErrorObjects = existingErrors.filter((e) => errorsToRemove.has(e.id));
			historyRows.push(
				...removedErrorObjects.map((err) => ({
					uniref: uniId,
					entryType: 'delete' as const,
					confType: 'error' as const,
					confCell: err.col,
					data: {
						confType: err.confType
					},
					created: time
				}))
			);
			await db.delete(table).where(inArray(table.id, Array.from(errorsToRemove)));
		}
		if (errorsToAdd.length > 0) {
			historyRows.push(
				...errorsToAdd.map((err) => ({
					uniref: uniId,
					entryType: 'create' as const,
					confType: 'error' as const,
					confCell: err.col,
					data: {
						confType: err.confType,
						value: err.value,
						message: err.message,
						options: err.options,
						lastValue: err.lastValue,
						resolved: err.resolved
					},
					created: time
				}))
			);
			await db.insert(table).values(errorsToAdd);
		}

		if (historyRows.length > 0) {
			await insertMultipleHistoryRows({
				db,
				resourceType: 'unifiedGuild',
				rows: historyRows
			});
		}

		return { errorsToAdd, errorsToRemove: Array.from(errorsToRemove) };
	}

	return {
		addError,
		commitErrors
	};
}

function doErrorsMatch(
	error: CellConfigRowSelect | CellConfigRowInsert,
	newError: CellConfigRowInsert | CellConfigRowSelect
): boolean {
	for (const k of new Set([...Object.keys(error), ...Object.keys(newError)])) {
		const key = k as keyof typeof error;
		if (key === 'id' || key === 'created' || key === 'refId' || key === 'resolved') continue;
		if ((error[key] ?? null) !== (newError[key] ?? null)) {
			return false;
		}
	}
	return true;
}

function findMatchingError(
	errors: (CellConfigRowSelect | CellConfigRowInsert)[],
	matchError: CellConfigRowInsert | CellConfigRowSelect
): (CellConfigRowSelect | CellConfigRowInsert) | null {
	for (const error of errors) {
		if (doErrorsMatch(error, matchError)) {
			return error;
		}
	}
	return null;
}

type ValType = string | number | boolean | null;

export interface NewError {
	multipleOptions?: {
		options: ValType[];
		value: ValType;
	};
	missingValue?: {
		value: ValType;
	};
	needsApproval?: {
		value: ValType;
		message: string;
	};
	needsApprovalCustom?: {
		value: ValType;
		lastValue: ValType;
	};
	matchWouldCauseDuplicate?: {
		value: ValType;
	};
	shouldNotBeNull?: {};
	invalidDataType?: {
		value: ValType;
		message: string;
	};
	contradictorySources?: {
		value: ValType;
		message: string;
	};
	canNotBeSetToNull?: {
		message: string;
	};
	canNotBeSetToWrongType?: {
		value: ValType;
		message: string;
	};
}

type NewErrorMerged = {
	value?: ValType;
	lastValue?: ValType;
	message?: string;
	options?: ValType[];
};
