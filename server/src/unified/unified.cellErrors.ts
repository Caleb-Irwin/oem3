import { z } from 'zod';
import { and, desc, eq, inArray, max } from 'drizzle-orm';
import { db } from '../db';
import { viewerProcedure } from '../trpc';
import { KV } from '../utils/kv';
import { paginateCircular, pickInitialIndex } from '../utils/pagination';
import { UnifierMap } from './unifier.map';
import type { UnifiedTableNames } from './types';
import { UnifiedTableNamesArray } from './types';
import { CellErrorArray, uniref } from '../db.schema';

const kv = new KV('unifiedErrors');

export const getErrorUrl = viewerProcedure
	.input(
		z.object({
			mode: z.enum(['prev', 'next']),
			currentUniId: z.number(),
			urlHash: z.string()
		})
	)
	.query(async ({ input: { mode, currentUniId, urlHash }, ctx: { user } }) => {
		const meta = JSON.parse(decodeURIComponent(urlHash.replace(/^#/, '') || '{}'));
		const deletedMode = meta.deleted === true,
			likelyPrev = (meta.prev as number) || null,
			likelyNext = (meta.next as number) || null;

		const uniRow = await db.query.uniref.findFirst({
			where: eq(uniref.uniId, currentUniId)
		});
		const tableName = uniRow!.resourceType as UnifiedTableNames;
		const refId = uniRow![tableName] as number;

		const allItemsWithErrors = await errorQueryBuilder(tableName, deletedMode);

		if (allItemsWithErrors.length === 0) {
			return { url: UnifierMap[tableName].pageUrl };
		}

		const ids = allItemsWithErrors.map((c) => c.id);
		const { id: newRefId, index: newIndex } = paginateCircular(ids, refId, mode, {
			prev: likelyPrev,
			next: likelyNext
		});

		await kv.set(
			`lastError-${tableName}-${user.username}${deletedMode ? '-deleteMode' : ''}`,
			String(newRefId)
		);

		return await getErrorReturn(allItemsWithErrors, tableName, deletedMode, newRefId, newIndex);
	});

export const getFirstErrorUrl = viewerProcedure
	.input(
		z.object({
			tableName: z.enum(UnifiedTableNamesArray),
			deletedMode: z.boolean().default(false)
		})
	)
	.query(async ({ input: { tableName, deletedMode }, ctx: { user } }) => {
		const query = errorQueryBuilder(tableName, deletedMode);
		const errors = await query;
		if (errors.length === 0) {
			throw new Error(
				'No errors found for this table (summary may be out of data; please wait for it to update)'
			);
		}

		const ids = errors.map((c) => c.id);
		const lastAccessed = parseInt(
			(await kv.get(
				`lastError-${tableName}-${user.username}${deletedMode ? '-deleteMode' : ''}`
			)) || '-1'
		);
		const refIndex = pickInitialIndex(ids, isNaN(lastAccessed) ? null : lastAccessed);
		const refId = ids[refIndex];

		return await getErrorReturn(errors, tableName, deletedMode, refId, refIndex);
	});

async function getErrorReturn(
	errors: { id: number }[],
	tableName: UnifiedTableNames,
	deletedMode: boolean,
	refId: number,
	refIndex: number
) {
	const prev = refIndex > 0 ? errors[refIndex - 1].id : errors[errors.length - 1].id,
		next = refIndex < errors.length - 1 ? errors[refIndex + 1].id : errors[0].id;

	const meta = {
		deleted: deletedMode,
		prev,
		next,
		prefetchURLs: (await Promise.all([getUniId(tableName, prev), getUniId(tableName, next)])).map(
			(id) => `/app/resource/${id}/unified/errors`
		)
	};

	return {
		url: `/app/resource/${await getUniId(tableName, refId)}/unified/errors#${encodeURIComponent(
			JSON.stringify(meta)
		)}`
	};
}

async function getUniId(tableName: UnifiedTableNames, id: number) {
	const row = await db.query.uniref.findFirst({
		where: eq(uniref[tableName], id)
	});
	return row!.uniId;
}

function errorQueryBuilder(tableName: UnifiedTableNames, deletedMode: boolean) {
	return db
		.selectDistinct({
			id: UnifierMap[tableName].table.id,
			mostRecentErrorTime: max(UnifierMap[tableName].confTable.created)
		})
		.from(UnifierMap[tableName].table)
		.innerJoin(
			UnifierMap[tableName].confTable,
			eq(UnifierMap[tableName].confTable.refId, UnifierMap[tableName].table.id)
		)
		.where(
			and(
				eq(UnifierMap[tableName].confTable.resolved, false),
				inArray(UnifierMap[tableName].confTable.confType, CellErrorArray),
				eq(UnifierMap[tableName].table.deleted, deletedMode)
			)
		)
		.groupBy(UnifierMap[tableName].table.id)
		.orderBy(desc(max(UnifierMap[tableName].confTable.created)))
		.$dynamic();
}
