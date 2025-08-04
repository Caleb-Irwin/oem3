import { db as DB, type Tx } from '../db';
import { insertHistory } from '../utils/history';
import type { CellConfigTable, CellConfigRowInsert } from './types';
import { and, eq } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { uniref } from '../db.schema';

interface CellSettingInput {
	db: typeof DB | Tx;
	table: CellConfigTable;
	refId: number;
	col: string;
}

export async function getCellConfigs({ db, table, refId, col }: CellSettingInput) {
	return await db
		.select()
		.from(table)
		.where(and(eq(table.refId, refId), eq(table.col, col as any)));
}

export async function getSetting(input: CellSettingInput) {
	const configs = await getCellConfigs(input);
	return configs?.find((c) => c.confType.startsWith('setting:')) ?? null;
}

export async function getUniId({
	db,
	table,
	refId
}: {
	db: typeof DB | Tx;
	table: CellConfigTable;
	refId: number;
}) {
	const tableName = getTableConfig(table).name;

	const unirefColumn = (uniref as any)[tableName];
	if (!unirefColumn) {
		throw new Error(`No uniref column found for table: ${tableName}`);
	}

	const unirefRow = await db.query.uniref.findFirst({
		where: eq(unirefColumn, refId)
	});

	if (!unirefRow) {
		throw new Error(`No uniref found for ${tableName}:${refId}`);
	}

	return unirefRow.uniId;
}

export async function modifySetting({
	db,
	table,
	refId,
	col,
	settingData,
	uniIdHint
}: {
	settingData: CellConfigRowInsert | null;
	uniIdHint: number | null;
} & CellSettingInput): Promise<void> {
	const tableName = getTableConfig(table).name;

	const uniId = uniIdHint ?? (await getUniId({ db, table, refId }));

	await db.transaction(async (db) => {
		const existing = await getSetting({ db, table, refId, col });
		if (existing === null && settingData === null) {
			return;
		} else if (settingData === null) {
			await db.delete(table).where(eq(table.id, existing!.id));
			await insertHistory({
				db,
				uniref: uniId,
				resourceType: tableName as any,
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
				resourceType: tableName as any,
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
				resourceType: tableName as any,
				entryType: 'create' as const,
				confCell: col,
				confType: 'setting' as const,
				data: settingData,
				created: Date.now(),
				exclude: ['created', 'refId']
			});
		}
	});
}
