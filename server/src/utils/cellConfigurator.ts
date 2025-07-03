import { eq, inArray } from 'drizzle-orm';
import { db as DB, type Tx } from '../db';
import { type CellSetting } from '../db.schema';
import type { UnifiedTables, VerifyCellValue, CellConfigTable } from './unifier';
import { insertHistory, insertMultipleHistoryRows, type InsertHistoryRowOptions } from './history';

export async function createCellConfigurator(
	table: CellConfigTable,
	id: number,
	uniId: number,
	db: typeof DB | Tx
) {
	const cellConfigs = await db.select().from(table).where(eq(table.refId, id));
	type CellConfig = (typeof cellConfigs)[number];

	const groupedConfigs = cellConfigs.reduce(
		(acc, config) => {
			const col = config.col;
			if (!acc[col]) {
				acc[col] = [];
			}
			acc[col].push(config);
			return acc;
		},
		{} as Record<string, typeof cellConfigs>
	);

	const newErrors: CellConfigRowInsert[] = [];

	function getCellSettings(col: string): {
		setting: CellSetting | null;
		conf: CellConfig | null;
	} {
		const configs = groupedConfigs[col];
		const setting = configs?.find((c) => c.confType.startsWith('setting:'));
		if (!setting) return { setting: null, conf: null };
		return { setting: setting.confType as CellSetting, conf: setting };
	}

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
			options: errorData.options ? JSON.stringify(errorData.options) : null,
			resolved: false,
			notes,
			created: Date.now()
		});
	}

	async function getConfiguredCellValue<T extends typeof cellTransformer>(
		{ key, val, options }: ReturnType<T>,
		oldVal: ReturnType<T>['val'],
		verifyCellValue: VerifyCellValue
	): Promise<ReturnType<T>['val']> {
		let setting = getCellSettings(key);
		let newVal = val;

		if (setting === null && options?.defaultSettingOfApprove) {
			setting = {
				setting: 'setting:approve',
				conf: null
			};
		}

		if (setting !== null) {
			if (setting.setting === 'setting:custom') {
				newVal = setting.conf?.value ?? null;
			} else if (setting.setting === 'setting:approve' && oldVal !== val) {
				const thresholdPercent = parseFloat(setting.conf?.value ?? '0');
				const lastApprovedValue = parseFloat(setting.conf?.lastValue ?? '0');

				const currentValue = parseFloat(val?.toString() ?? '0');
				const percentChange =
					lastApprovedValue === 0
						? currentValue === 0
							? 0
							: 100
						: Math.abs((currentValue - lastApprovedValue) / lastApprovedValue) * 100;

				if (percentChange > thresholdPercent) {
					addError(
						key as any,
						{
							needsApproval: {
								value: val
							}
						},
						`Value changed by ${percentChange.toFixed(2)}% which exceeds threshold of ${thresholdPercent}%`
					);
					newVal = oldVal;
				} else {
					await db
						.update(table)
						.set({ lastValue: currentValue.toString() })
						.where(eq(table.id, setting.conf!.id));
					await insertHistory({
						db,
						uniref: uniId,
						resourceType: 'unifiedGuild',
						entryType: 'update',
						data: {
							cellConfigChange: {
								type: 'settingUpdated',
								col: key,
								confType: setting.setting,
								change: { lastValue: currentValue.toString() }
							}
						},
						created: Date.now()
					});
				}
			} else if (setting.setting === 'setting:approveCustom') {
				newVal = setting.conf?.value ?? null;

				const lastTrackedValue = setting.conf?.lastValue ?? null;
				const currentValue = val?.toString() ?? null;
				if (lastTrackedValue !== currentValue) {
					addError(
						key as any,
						{
							needsApprovalCustom: {
								value: val?.toString() ?? 'Null'
							}
						},
						`Underlying value changed from "${lastTrackedValue}" to "${currentValue}"`
					);
				}
			}
		}

		const { err, coercedValue } = await verifyCellValue({
			value: newVal,
			col: key,
			db
		});
		if (err) {
			addError(key as any, err);
			newVal = oldVal;
		} else {
			newVal = coercedValue ?? null;
		}

		if (options?.shouldNotBeNull && newVal === null) {
			addError(key as any, {
				shouldNotBeNull: {}
			});
		}

		if (
			options?.shouldMatch &&
			!options.shouldMatch.ignore &&
			newVal !== options.shouldMatch.val &&
			options.shouldMatch.val !== null
		) {
			addError(key as any, {
				contradictorySources: {
					value: options.shouldMatch.val,
					message: `Value "${newVal}" does not match "${options.shouldMatch.val}", which is found in secondary source "${options.shouldMatch.name}"`
				}
			});
		}

		return newVal;
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

		return errorsToAdd;
	}

	return {
		getConfiguredCellValue,
		addError,
		commitErrors
	};
}

export const cellTransformer = <T extends UnifiedTables, K extends keyof T['$inferSelect']>(
	key: K,
	val: T['$inferSelect'][K],
	options?: CellTransformerOptions<T['$inferSelect'][K]>
) => {
	return {
		key,
		val,
		options
	};
};

type CellTransformerOptions<T> = {
	shouldMatch?: { name: string; val: T; ignore?: boolean };
	shouldNotBeNull?: boolean;
	defaultSettingOfApprove?: boolean;
};

function doErrorsMatch(
	error: CellConfigRowSelect | CellConfigRowInsert,
	newError: CellConfigRowInsert | CellConfigRowSelect
): boolean {
	for (const k of new Set([...Object.keys(error), ...Object.keys(newError)])) {
		const key = k as keyof typeof error;
		if (key === 'id' || key === 'created' || key === 'refId') continue;
		if ((error[key] ?? null) !== (newError[key] ?? null)) {
			console.log(`Error mismatch on key "${key}": "${error[key]}" !== "${newError[key]}"`);
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

// Generic types that work with any unified table's config table
export type CellConfigRowInsert = CellConfigTable['$inferInsert'];
export type CellConfigRowSelect = CellConfigTable['$inferSelect'];

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
	};
	needsApprovalCustom?: {
		value: ValType;
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
	message?: string;
	options?: ValType[];
};
