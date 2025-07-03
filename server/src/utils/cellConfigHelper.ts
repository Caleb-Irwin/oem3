import type { db as DB, Tx } from '../db';
import { UnifierMap } from './unifier.map';
import type { CellConfigTable, UnifiedTableNames } from './unifier';
import type { CellConfigRowInsert } from './cellConfigurator';
import { eq, and } from 'drizzle-orm';
import { uniref } from '../db.schema';
import { guildTriggerHooks } from '../routers/guild';
import { insertHistory } from './history';

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

	const table: CellConfigTable = UnifierMap[tablePrefix].confTable;

	const unirefColumn = (uniref as any)[tablePrefix];
	if (!unirefColumn) {
		throw new Error(`No uniref column found for table prefix: ${tablePrefix}`);
	}

	const unirefRow = await db.query.uniref.findFirst({
		where: eq(unirefColumn, refId)
	});

	if (!unirefRow) {
		throw new Error(`No uniref found for ${tablePrefix}:${refId}`);
	}

	const uniId = unirefRow.uniId;

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
		const existing = await getSetting();
		if (existing === null && settingData === null) {
		} else if (settingData === null) {
			await db.delete(table).where(and(eq(table.refId, refId), eq(table.col, col as any)));
			await insertHistory({
				db,
				uniref: uniId,
				resourceType: tablePrefix,
				entryType: 'delete' as const,
				confCell: col,
				confType: 'setting' as const,
				data: { message: 'Setting deleted (set to default: Auto)' },
				created: Date.now()
			});
		} else if (existing?.id) {
			if (settingData.id) throw new Error('Setting data should not contain an id when updating');
			await db
				.update(table)
				.set({
					...settingData
				})
				.where(eq(table.id, existing.id));
			await insertHistory({
				db,
				uniref: uniId,
				resourceType: tablePrefix,
				entryType: 'update' as const,
				confCell: col,
				confType: 'setting' as const,
				data: settingData,
				prev: existing,
				created: Date.now(),
				exclude: ['created', 'refId']
			});
		} else {
			await db.insert(table).values(settingData);
			await insertHistory({
				db,
				uniref: uniId,
				resourceType: tablePrefix,
				entryType: 'create' as const,
				confCell: col,
				confType: 'setting' as const,
				data: settingData,
				created: Date.now(),
				exclude: ['created', 'refId']
			});
		}
		await unifier._updateRow({ id: refId, db: db, onUpdateCallback: () => null });
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
