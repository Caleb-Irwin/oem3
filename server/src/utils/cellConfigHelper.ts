import type { db as DB, Tx } from '../db';
import { UnifierMap } from './unifier.map';
import type { CellConfigTable, UnifiedTableNames } from './unifier';
import type { CellConfigRowInsert } from './cellConfigurator';
import { eq, and } from 'drizzle-orm';
import { uniref } from '../db.schema';

export async function getCellConfigHelper(compoundId: string, col: string, db: typeof DB | Tx) {
	const parts = compoundId.split(':');
	if (parts.length !== 2) {
		throw new Error(`Invalid compoundId format: ${compoundId}. Expected format: "table:refId"`);
	}

	const [tablePrefix, refIdStr] = parts;
	const refId = Number(refIdStr);

	if (isNaN(refId) || refId <= 0) {
		throw new Error(`Invalid refId in compoundId: ${refIdStr}. Must be a positive number`);
	}

	if (!(tablePrefix in UnifierMap)) {
		const supportedTables = Object.keys(UnifierMap).join(', ');
		throw new Error(
			`Unsupported table prefix: ${tablePrefix}. Supported tables: ${supportedTables}`
		);
	}

	const table: CellConfigTable = UnifierMap[tablePrefix as UnifiedTableNames].confTable;

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
			return;
		} else if (settingData === null) {
			await db.delete(table).where(and(eq(table.refId, refId), eq(table.col, col as any)));
			return;
		} else if (existing?.id) {
			if (settingData.id) throw new Error('Setting data should not contain an id when updating');
			await db
				.update(table)
				.set({
					...settingData
				})
				.where(eq(table.id, existing.id));
			return;
		} else {
			await db.insert(table).values(settingData);
			return;
		}
	}

	return {
		meta: {
			table,
			refId,
			tablePrefix,
			compoundId,
			uniId
		},
		unifier: UnifierMap[tablePrefix as UnifiedTableNames].unifier,
		getConfigs,
		getSetting,
		updateSetting
	};
}
