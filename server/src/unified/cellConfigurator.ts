import { eq } from 'drizzle-orm';
import { db as DB, type Tx } from '../db';
import { type CellSetting } from '../db.schema';
import type { UnifiedTables, CellConfigTable } from './types';
import type { VerifyCellValue } from './unifier';
import { insertHistory } from '../utils/history';
import { createErrorManager } from './errorManager';

export async function createCellConfigurator(
	table: CellConfigTable,
	id: number,
	uniId: number,
	db: typeof DB | Tx,
	verifyCellValue: VerifyCellValue
) {
	const cellConfigs = await db.select().from(table).where(eq(table.refId, id));
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

	async function getConfiguredCellValue<T extends typeof cellTransformer>(
		{ key, val, options }: ReturnType<T>,
		oldVal: ReturnType<T>['val']
	): Promise<ReturnType<T>['val']> {
		let setting = getCellSettings(key);
		let newVal = val;

		// TODO - Handle default setting of approve
		if (setting === null && options?.defaultSettingOfApprove) {
			setting = {
				setting: 'setting:approve',
				conf: null
			};
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
							value: val,
							message: `Value changed by ${percentChange.toFixed(2)}% which exceeds threshold of ${thresholdPercent}%`
						}
					});
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
			col: key,
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

	return {
		getConfiguredCellValue,
		addError: errorManager.addError,
		commitErrors: errorManager.commitErrors
	};
}

export type CellConfigurator = Awaited<ReturnType<typeof createCellConfigurator>>;

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
	shouldMatch?: { primary: string; secondary: string; val: T; ignore?: boolean };
	shouldNotBeNull?: boolean;
	defaultSettingOfApprove?: boolean;
};
