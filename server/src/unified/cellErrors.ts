import { eq } from 'drizzle-orm';
import {
	getCellConfigs,
	getSetting,
	getUniId,
	modifySetting,
	type CellSettingInput
} from './cellSettings';
import { insertHistory } from '../utils/history';
import { getTableConfig } from 'drizzle-orm/pg-core';

export async function modifyError(
	input: {
		errorId: number;
		errorAction: ErrorAction;
		uniIdHint: number | null;
	} & CellSettingInput
) {
	const { db, table, refId, col, unifiedTable, uniIdHint, errorAction, errorId } = input;
	const tableName = getTableConfig(unifiedTable).name;
	const cellConfigs = await getCellConfigs(input);
	if (!cellConfigs || cellConfigs.length === 0) {
		throw new Error(`No cell configs found for refId: ${refId}, col: ${col}`);
	}
	const error = cellConfigs.find((c) => c.id === errorId);
	if (!error) {
		throw new Error(`No error found with id: ${errorId}`);
	}

	const uniId = uniIdHint ?? (await getUniId(input));

	if (
		errorAction === 'ignore' ||
		errorAction === 'markAsResolved' ||
		errorAction === 'keepValue' ||
		errorAction === 'reject'
	) {
		await db.update(table).set({ resolved: true }).where(eq(table.id, errorId));
		await insertHistory({
			db,
			uniref: uniId,
			resourceType: tableName as any,
			entryType: 'update',
			confType: 'error',
			confCell: col,
			data: {
				resolved: true
			},
			prev: { resolved: error.resolved },
			created: Date.now()
		});
	} else if (errorAction === 'keepCustom') {
		const existing = await getSetting(input);
		if (!existing || existing.confType !== 'setting:approveCustom') {
			throw new Error(
				`Cannot keep custom value for error ${errorId} as no approve custom setting exists`
			);
		}
		await modifySetting({
			...input,
			settingData: {
				lastValue: error.value,
				confType: 'setting:approveCustom',
				created: Date.now(),
				col: existing.col,
				refId: existing.refId
			}
		});
	} else if (errorAction === 'setAuto') {
		const existing = await getSetting(input);
		if (!existing || existing.confType !== 'setting:approveCustom') {
			throw new Error(
				`Cannot keep custom value for error ${errorId} as no approve custom setting exists`
			);
		}
		await modifySetting({
			...input,
			settingData: null
		});
	} else if (errorAction === 'approve') {
		const existing = await getSetting(input);
		if (!existing || existing.confType !== 'setting:approve') {
			throw new Error(`Cannot keep custom value for error ${errorId} as no approve setting exists`);
		}
		await modifySetting({
			...input,
			settingData: {
				lastValue: error.value,
				confType: 'setting:approve',
				created: Date.now(),
				col: existing.col,
				refId: existing.refId
			}
		});
	} else {
		throw new Error(`TODO - Not implemented for action: ${errorAction}`);
	}
}

export const ErrorActionValues = [
	'markAsResolved',
	'ignore',
	'approve',
	'reject',
	'keepCustom',
	'setAuto',
	'keepValue'
] as const;

export type ErrorAction = (typeof ErrorActionValues)[number];
