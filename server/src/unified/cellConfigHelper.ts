import type { db as DB, Tx } from '../db';
import { UnifierMap } from './unifier.map';
import type { CellConfigTable, UnifiedTableNames, CellConfigRowInsert } from './types';
import { eq, and } from 'drizzle-orm';
import { guildTriggerHooks } from '../routers/guild';
import { getUniId, modifySetting } from './cellSettings';

const triggerMap: { [key in keyof typeof UnifierMap]: () => void } = {
	unifiedGuild: guildTriggerHooks
};

export async function getCellConfigHelper(compoundId: string, col: string, db: typeof DB | Tx) {
	const parts = compoundId.split(':');
	if (parts.length !== 2) {
		throw new Error(`Invalid compoundId format: ${compoundId}. Expected format: "table:refId"`);
	}

	const [tablePrefixRaw, refIdStr] = parts;
	const refId = Number(refIdStr);

	if (isNaN(refId) || refId <= 0) {
		throw new Error(`Invalid refId in compoundId: ${refIdStr}. Must be a positive number`);
	}

	if (!(tablePrefixRaw in UnifierMap)) {
		const supportedTables = Object.keys(UnifierMap).join(', ');
		throw new Error(
			`Unsupported table prefix: ${tablePrefixRaw}. Supported tables: ${supportedTables}`
		);
	}

	const tablePrefix = tablePrefixRaw as UnifiedTableNames;

	const table: CellConfigTable = UnifierMap[tablePrefix].confTable,
		unifiedTable = UnifierMap[tablePrefix].table;

	const uniId = await getUniId({ db, unifiedTable, refId });

	const unifier = UnifierMap[tablePrefix].unifier;

	async function getConfigs() {
		return await db
			.select()
			.from(table)
			.where(and(eq(table.refId, refId), eq(table.col, col as any)));
	}

	async function getSetting() {
		const configs = await getConfigs();
		return configs?.find((c) => c.confType.startsWith('setting:')) ?? null;
	}

	async function updateSetting(settingData: CellConfigRowInsert | null) {
		await db.transaction(async (db) => {
			await modifySetting({
				db,
				table,
				refId,
				col,
				settingData,
				uniIdHint: uniId,
				unifiedTable
			});
			await unifier._updateRow({ id: refId, db: db, onUpdateCallback: () => null });
		});

		if (triggerMap[tablePrefix]) {
			triggerMap[tablePrefix]();
		} else {
			throw new Error(`No trigger found for table prefix: ${tablePrefix}`);
		}
	}

	return {
		meta: {
			table,
			refId,
			tablePrefix,
			compoundId,
			uniId,
			unifier
		},
		getConfigs,
		getSetting,
		updateSetting
	};
}
