import { eq } from 'drizzle-orm';
import { db as DB, type Tx } from '../db';
import { type CellSetting } from '../db.schema';
import type { UnifiedTables, CellConfigTable } from './types';
import { createErrorManager, type ValType } from './errorManager';
import { modifySetting } from './cellSettings';
import type { VerifyCellValue } from './cellVerification';
import type { RowTypeBase } from './unifier';

export async function createCellConfigurator<CellConfTable extends CellConfigTable>({
	table,
	unifiedTable,
	id,
	uniId,
	db,
	verifyCellValue
}: {
	table: CellConfTable;
	unifiedTable: UnifiedTables;
	id: number;
	uniId: number;
	db: typeof DB | Tx;
	verifyCellValue: ReturnType<typeof VerifyCellValue>;
}) {
	const cellConfigs = await db
		.select()
		.from(table as CellConfigTable)
		.where(eq(table.refId, id));
	type CellConfig = (typeof cellConfigs)[number];

	const errorManager = createErrorManager(db, table, id, uniId, cellConfigs);

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

	function getCellSettings(col: string): {
		setting: CellSetting | null;
		conf: CellConfig | null;
	} {
		const configs = groupedConfigs[col];
		const setting = configs?.find((c) => c.confType.startsWith('setting:'));
		if (!setting) return { setting: null, conf: null };
		return { setting: setting.confType as CellSetting, conf: setting };
	}

	async function getConfiguredCellValue(
		{ key, val, options }: BasicCellTransformResults,
		oldVal: BasicCellTransformResults['val']
	): Promise<BasicCellTransformResults['val']> {
		let setting = getCellSettings(key as string);
		let newVal = val;

		if (options?.defaultSettingOfApprove) {
			const { lastThresholdPercent, currentThresholdPercent } = options.defaultSettingOfApprove;
			if (
				(lastThresholdPercent === null && setting === null) ||
				(setting.setting === 'setting:approve' &&
					setting.conf?.value === lastThresholdPercent?.toString())
			) {
				if (currentThresholdPercent !== null) {
					const settingData = {
						confType: 'setting:approve',
						value: currentThresholdPercent?.toString() ?? '0',
						lastValue: oldVal?.toString() ?? '0',
						col: key as any,
						refId: id,
						created: Date.now(),
						isDefaultSetting: true
					} as const;
					await modifySetting({
						db,
						table: table,
						unifiedTable: unifiedTable,
						refId: id,
						col: key,
						settingData,
						uniIdHint: uniId
					});
					setting = {
						setting: 'setting:approve',
						conf: { ...settingData } as any
					};
				} else {
					await modifySetting({
						db,
						table: table,
						unifiedTable: unifiedTable,
						refId: id,
						col: key,
						settingData: null,
						uniIdHint: uniId
					});
					setting = { setting: null, conf: null };
				}

				if (setting.setting === 'setting:approve' && setting.conf) {
					setting.conf.lastValue =
						options.defaultSettingOfApprove.lastValueOverride?.toString() ?? null;
				}
			}
		}

		// Handle Cell Setting Logic
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
					errorManager.addError(key as any, {
						needsApproval: {
							value: val as ValType,
							message: `Value changed by ${percentChange.toFixed(2)}% which exceeds threshold of ${thresholdPercent}%`
						}
					});
					newVal = oldVal;
				} else if (currentValue.toString() !== setting.conf?.lastValue) {
					await modifySetting({
						db,
						table: table,
						unifiedTable: unifiedTable,
						refId: id,
						col: key,
						settingData: {
							confType: 'setting:approve',
							value: setting.conf?.value,
							lastValue: currentValue.toString(),
							col: key as any,
							refId: id,
							created: Date.now()
						},
						uniIdHint: uniId
					});
				}
			} else if (setting.setting === 'setting:approveCustom') {
				newVal = setting.conf?.value ?? null;

				const lastTrackedValue = setting.conf?.lastValue ?? null;
				const currentValue = val?.toString() ?? null;
				if (lastTrackedValue !== currentValue) {
					errorManager.addError(key as any, {
						needsApprovalCustom: {
							value: val?.toString() ?? 'Null',
							lastValue: lastTrackedValue?.toString() ?? 'Null'
						}
					});
				}
			}
		}

		// Verify Cell Value Logic
		const { err, coercedValue } = await verifyCellValue({
			value: newVal,
			col: key as any,
			db
		});
		if (err) {
			errorManager.addError(key as any, err);
			newVal = oldVal;
		} else {
			newVal = coercedValue ?? null;
		}

		// Should Not Be Null Logic
		if (options?.shouldNotBeNull && newVal === null) {
			errorManager.addError(key as any, {
				shouldNotBeNull: {}
			});
		}

		// Should Match Logic
		const bothAreStrings =
			typeof newVal === 'string' && typeof options?.shouldMatch?.val === 'string';
		if (
			setting.setting !== 'setting:custom' &&
			setting.setting !== 'setting:approveCustom' &&
			options?.shouldMatch &&
			!options.shouldMatch.ignore &&
			options.shouldMatch.val !== null &&
			!(bothAreStrings && newVal !== null
				? (newVal as string).trim() === (options.shouldMatch.val as string).trim() ||
					(options.shouldMatch.val as string).trim() === ''
				: newVal === options.shouldMatch.val)
		) {
			errorManager.addError(key as any, {
				contradictorySources: {
					value: options.shouldMatch.val,
					message: `Value "${newVal}" found in primary source "${options.shouldMatch.primary}", does not match "${options.shouldMatch.val}", found in secondary source "${options.shouldMatch.secondary}"`
				}
			});
		}

		return newVal;
	}

	async function getConfiguredRow<
		TableType extends UnifiedTables,
		RowType extends RowTypeBase<TableType>
	>(
		transformed: {
			[K in keyof TableType['$inferSelect']]: ReturnType<
				typeof cellTransformer<TableType, keyof TableType['$inferSelect']>
			>;
		},
		originalRow: RowType,
		connectionColumns: Set<string>
	): Promise<{
		changes: Partial<TableType['$inferInsert']>;
		changesToCommit: Partial<TableType['$inferInsert']>;
	}> {
		const newRow = {
				id: originalRow.id,
				lastUpdated: originalRow.lastUpdated
			} as Partial<TableType['$inferInsert']>,
			resolvedKeys: Set<keyof TableType['$inferInsert']> = new Set(['id', 'lastUpdated']),
			unresolvedKeys = Object.keys(transformed) as (keyof TableType['$inferInsert'])[],
			changes: Partial<TableType['$inferInsert']> = {},
			changesToCommit: Partial<TableType['$inferInsert']> = {};

		let unresolvedCount = 0;
		while (unresolvedKeys.length > 0) {
			const key = unresolvedKeys.shift()!;
			if (resolvedKeys.has(key)) continue;
			const transformedEntry = transformed[key];
			if (
				transformedEntry.options?.dependsOn &&
				!resolvedKeys.isSupersetOf(transformedEntry.options.dependsOn)
			) {
				unresolvedKeys.push(key);
				unresolvedCount++;
				if (unresolvedCount > 100)
					throw new Error('Possible circular dependency detected in cell transformations');
				continue;
			}
			if (typeof transformedEntry.val === 'function') {
				const v = await (transformedEntry.val as any)(newRow);
				console.log(v);
				transformedEntry.val = v;
				console.log(transformedEntry.val);
			}
			const newVal = (await getConfiguredCellValue(
				transformedEntry as any,
				originalRow[key] as any
			)) as any;
			if (originalRow[key] !== newVal) {
				if (!connectionColumns.has(key.toString())) {
					changesToCommit[key] = newVal;
				}
				changes[key] = newVal;
			}
			newRow[key] = newVal;
			resolvedKeys.add(key);
		}

		return {
			changes,
			changesToCommit
		};
	}

	const hasAnyNonDefaultCellSettings = cellConfigs.some(
		(c) => c.confType.startsWith('setting:') && !c.isDefaultSetting
	);

	return {
		getCellSettings,
		getConfiguredRow,
		getConfiguredCellValue,
		addError: errorManager.addError,
		commitErrors: errorManager.commitErrors,
		hasAnyNonDefaultCellSettings
	};
}

export type CellConfigurator = Awaited<ReturnType<typeof createCellConfigurator>>;

type BasicCellTransformResults = {
	key: string;
	val: ValType;
	options?: CellTransformerOptions<ValType, string>;
};

export const cellTransformer = <T extends UnifiedTables, K extends keyof T['$inferSelect']>(
	key: K,
	val:
		| T['$inferSelect'][K]
		| ((
				partial: Partial<T['$inferSelect']>
		  ) => T['$inferSelect'][K] | Promise<T['$inferSelect'][K]>),
	options?: CellTransformerOptions<T['$inferSelect'][K], K>
) => {
	return {
		key,
		val,
		options
	};
};

type CellTransformerOptions<T, K> = {
	shouldMatch?: { primary: string; secondary: string; val: T; ignore?: boolean };
	shouldNotBeNull?: boolean;
	defaultSettingOfApprove?: {
		lastThresholdPercent: number | null;
		currentThresholdPercent: number | null;
		lastValueOverride: number | null;
	};
	dependsOn?: Set<K>;
};
