import { and, desc, eq, getTableName, isNull, or } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { db } from '../db';
import type { AllSourceTables, AllSourceTableNames, UnifiedTableNames } from './types';
import { AllSourceTableNamesArray } from './types';
import { UnifierMap } from './unifier.map';
import { uniref } from '../utils/uniref.table';
import { unmatchedErrors } from './unmatchedErrors.table';
import { z } from 'zod';
import { generalProcedure, viewerProcedure } from '../trpc';
import { KV } from '../utils/kv';
import { paginateCircular, pickInitialIndex } from '../utils/pagination';
import { updateByChangesetType } from '../routers/resources';
import { unifiedOnUpdateCallback } from '../routers/unified.helpers';
import { runSummariesWorker } from '../routers/summaries';

export const updateUnmatched = generalProcedure
	.input(
		z.object({
			uniId: z.number(),
			tableName: z.string(),
			allowUnmatched: z.boolean()
		})
	)
	.mutation(async ({ input }) => {
		const { uniId, allowUnmatched, tableName } = input;

		await db
			.insert(unmatchedErrors)
			.values({ uniId, allowUnmatched, created: Date.now() })
			.onConflictDoUpdate({
				target: unmatchedErrors.uniId,
				set: { allowUnmatched, created: Date.now() }
			})
			.execute();

		updateByChangesetType(tableName);
		unifiedOnUpdateCallback(uniId);
		runSummariesWorker({});
	});

function getConnection(unifiedTableName: UnifiedTableNames, connectionTable: AllSourceTables) {
	const conf = UnifierMap[unifiedTableName].unifier.conf.connections;
	const all = [conf.primaryTable, ...conf.otherTables];
	const found = all.find((c) => c.table === connectionTable);
	if (!found) throw new Error(`Connection not found for table`);
	return found;
}

export async function getUnmatchedIdsForConnection(
	unifiedTableName: UnifiedTableNames,
	connectionTable: AllSourceTables
): Promise<number[]> {
	const connection = getConnection(unifiedTableName, connectionTable);
	const unifiedTable = UnifierMap[unifiedTableName].table as any;
	const refCol = (unifiedTable as any)[connection.refCol];
	const sourceName = getTableConfig(connection.table).name as keyof typeof uniref;

	const rows = await db
		.select({ id: connection.table.id })
		.from(connection.table)
		.leftJoin(unifiedTable, eq(refCol, connection.table.id))
		.innerJoin(uniref, eq((uniref as any)[sourceName], connection.table.id))
		.leftJoin(unmatchedErrors, eq(unmatchedErrors.uniId, uniref.uniId))
		.where(
			and(
				eq(connection.table.deleted, false),
				isNull(unifiedTable.id),
				or(isNull(unmatchedErrors.allowUnmatched), eq(unmatchedErrors.allowUnmatched, false))
			)
		);

	return rows.map((r) => r.id as number);
}

export async function getAllUnmatchedByTableName(
	connectionTableName: AllSourceTableNames
): Promise<number[]> {
	const entries = Object.entries(UnifierMap) as Array<
		[UnifiedTableNames, (typeof UnifierMap)[UnifiedTableNames]]
	>;
	let resolvedConn: { unifiedName: UnifiedTableNames; table: AllSourceTables } | null = null;
	for (const [unifiedName, v] of entries) {
		const conf = v.unifier.conf.connections;
		const all = [conf.primaryTable, ...conf.otherTables];
		for (const c of all) {
			const name = getTableConfig(c.table).name as AllSourceTableNames;
			if (name === connectionTableName) {
				resolvedConn = { unifiedName, table: c.table };
				break;
			}
		}
		if (resolvedConn) break;
	}
	if (!resolvedConn) throw new Error('No unified mapping found for given source table name');

	return await getUnmatchedIdsForConnection(resolvedConn.unifiedName, resolvedConn.table);
}

const kv = new KV('unmatched');

function resolveConnectionByName(connectionTableName: AllSourceTableNames) {
	const entries = Object.entries(UnifierMap) as Array<
		[UnifiedTableNames, (typeof UnifierMap)[UnifiedTableNames]]
	>;
	for (const [unifiedName, v] of entries) {
		const conf = v.unifier.conf.connections;
		const all = [conf.primaryTable, ...conf.otherTables];
		for (const c of all) {
			const name = getTableConfig(c.table).name as AllSourceTableNames;
			if (name === connectionTableName) {
				return { unifiedName, connection: c } as const;
			}
		}
	}
	throw new Error('No unified mapping found for given source table name');
}

function unmatchedQueryBuilder(connectionTableName: AllSourceTableNames) {
	const { unifiedName, connection } = resolveConnectionByName(connectionTableName);
	const unifiedTable = UnifierMap[unifiedName].table as any;
	const refCol = (unifiedTable as any)[connection.refCol];
	const sourceName = getTableConfig(connection.table).name as keyof typeof uniref;

	return db
		.selectDistinct({ id: connection.table.id, created: unmatchedErrors.created })
		.from(connection.table)
		.leftJoin(unifiedTable, eq(refCol, connection.table.id))
		.innerJoin(uniref, eq((uniref as any)[sourceName], connection.table.id))
		.leftJoin(unmatchedErrors, eq(unmatchedErrors.uniId, uniref.uniId))
		.where(
			and(
				eq(connection.table.deleted, false),
				isNull(unifiedTable.id),
				or(isNull(unmatchedErrors.allowUnmatched), eq(unmatchedErrors.allowUnmatched, false))
			)
		)
		.orderBy(desc(unmatchedErrors.created))
		.$dynamic();
}

async function getUniIdBySource(connectionTableName: AllSourceTableNames, id: number) {
	const column = connectionTableName as keyof typeof uniref;
	const row = await db.query.uniref.findFirst({
		where: eq((uniref as any)[column], id)
	});
	return row!.uniId;
}

async function getUnmatchedReturn(
	connectionTableName: AllSourceTableNames,
	items: { id: number }[],
	refId: number,
	refIndex: number
) {
	const prev = refIndex > 0 ? items[refIndex - 1].id : items[items.length - 1].id,
		next = refIndex < items.length - 1 ? items[refIndex + 1].id : items[0].id;

	const meta = {
		prev,
		next,
		prefetchURLs: (
			await Promise.all([
				getUniIdBySource(connectionTableName, prev),
				getUniIdBySource(connectionTableName, next)
			])
		).map((id) => `/app/resource/${id}?unmatchedMode=true`)
	};

	return {
		url: `/app/resource/${await getUniIdBySource(connectionTableName, refId)}?unmatchedMode=true#${encodeURIComponent(
			JSON.stringify(meta)
		)}`
	};
}

export const getUnmatchedUrl = viewerProcedure
	.input(
		z.object({
			mode: z.enum(['prev', 'next']),
			currentUniId: z.number(),
			urlHash: z.string()
		})
	)
	.query(async ({ input: { mode, currentUniId, urlHash }, ctx: { user } }) => {
		const meta = JSON.parse(decodeURIComponent(urlHash.replace(/^#/, '') || '{}'));
		const likelyPrev = (meta.prev as number) || null,
			likelyNext = (meta.next as number) || null;

		const uniRow = await db.query.uniref.findFirst({ where: eq(uniref.uniId, currentUniId) });
		const resourceType = uniRow!.resourceType as string;
		if (!AllSourceTableNamesArray.includes(resourceType as any)) {
			throw new Error('Current resource is not a source table for unmatched navigation');
		}
		const sourceName = resourceType as AllSourceTableNames;
		const sourceRefId = uniRow![sourceName] as number;

		const items = await unmatchedQueryBuilder(sourceName);
		if (items.length === 0) {
			for (const { unifier, pageUrl } of Object.values(UnifierMap)) {
				const connection = [
					unifier.conf.connections.primaryTable,
					...unifier.conf.connections.otherTables
				].find((c) => getTableName(c.table) === sourceName);
				if (connection) {
					return { url: pageUrl };
				}
			}
		}

		const ids = items.map((c) => c.id).filter((id): id is number => typeof id === 'number');
		const { id: newRefId, index: newIndex } = paginateCircular(ids, sourceRefId, mode, {
			prev: likelyPrev,
			next: likelyNext
		});

		await kv.set(`lastUnmatched-${sourceName}-${user.username}`, String(newRefId));

		const simpleItems = ids.map((id) => ({ id }));
		return await getUnmatchedReturn(sourceName, simpleItems, newRefId, newIndex);
	});

export const getFirstUnmatchedUrl = viewerProcedure
	.input(
		z.object({
			sourceTableName: z.enum(AllSourceTableNamesArray)
		})
	)
	.query(async ({ input: { sourceTableName }, ctx: { user } }) => {
		const sourceName = sourceTableName as AllSourceTableNames;
		const items = await unmatchedQueryBuilder(sourceName);
		if (items.length === 0) {
			throw new Error('No unmatched items found for this source table');
		}

		const ids = items.map((c) => c.id).filter((id): id is number => typeof id === 'number');
		const lastAccessed = parseInt(
			(await kv.get(`lastUnmatched-${sourceTableName}-${user.username}`)) || '-1'
		);
		const refIndex = pickInitialIndex(ids, isNaN(lastAccessed) ? null : lastAccessed);
		const refId = ids[refIndex];

		const simpleItems = ids.map((id) => ({ id }));
		return await getUnmatchedReturn(sourceName, simpleItems, refId, refIndex);
	});
