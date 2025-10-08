import { and, eq, inArray, countDistinct, isNull, or, count } from 'drizzle-orm';
import { db } from '../../db';
import type { TableConnection, UnifiedTableNames } from '../../unified/types';
import { UnifierMap } from '../../unified/unifier.map';
import { work } from '../../utils/workerBase';
import {
	CellErrorArray,
	type CellError,
	summaries,
	uniref,
	unmatchedErrors
} from '../../db.schema';
import { getTableConfig } from 'drizzle-orm/pg-core';

work({
	process: async ({}) => {
		await updateUnifiedSummary('unifiedGuild');
		await updateUnifiedSummary('unifiedSpr');
		await updateUnifiedSummary('unifiedProduct');
	}
});

async function updateUnifiedSummary(tableName: UnifiedTableNames) {
	return await db.transaction(async () => {
		const nonDeletedResult = await db
			.select({ count: countDistinct(UnifierMap[tableName].table.id) })
			.from(UnifierMap[tableName].table)
			.innerJoin(
				UnifierMap[tableName].confTable,
				eq(UnifierMap[tableName].confTable.refId, UnifierMap[tableName].table.id)
			)
			.where(
				and(
					eq(UnifierMap[tableName].confTable.resolved, false),
					inArray(UnifierMap[tableName].confTable.confType, CellErrorArray),
					or(
						isNull(UnifierMap[tableName].table.deleted),
						eq(UnifierMap[tableName].table.deleted, false)
					)
				)
			);

		const deletedResult = await db
			.select({ count: countDistinct(UnifierMap[tableName].table.id) })
			.from(UnifierMap[tableName].table)
			.innerJoin(
				UnifierMap[tableName].confTable,
				eq(UnifierMap[tableName].confTable.refId, UnifierMap[tableName].table.id)
			)
			.where(
				and(
					eq(UnifierMap[tableName].confTable.resolved, false),
					inArray(UnifierMap[tableName].confTable.confType, CellErrorArray),
					eq(UnifierMap[tableName].table.deleted, true)
				)
			);

		const nonDeletedConfsByType = await db
			.select({
				confType: UnifierMap[tableName].confTable.confType,
				count: count()
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
					or(
						isNull(UnifierMap[tableName].table.deleted),
						eq(UnifierMap[tableName].table.deleted, false)
					)
				)
			)
			.groupBy(UnifierMap[tableName].confTable.confType);

		const deletedConfsByType = await db
			.select({
				confType: UnifierMap[tableName].confTable.confType,
				count: count()
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
					eq(UnifierMap[tableName].table.deleted, true)
				)
			)
			.groupBy(UnifierMap[tableName].confTable.confType);

		const summary: UnifiedErrorSummary = {
			itemCounts: {
				nonDeletedWithErrors: nonDeletedResult[0]?.count || 0,
				deletedWithErrors: deletedResult[0]?.count || 0,
				totalWithErrors: (nonDeletedResult[0]?.count || 0) + (deletedResult[0]?.count || 0)
			},
			totalErrorCounts: {
				nonDeleted: nonDeletedConfsByType.reduce((sum, item) => sum + item.count, 0),
				deleted: deletedConfsByType.reduce((sum, item) => sum + item.count, 0),
				total: [...nonDeletedConfsByType, ...deletedConfsByType].reduce(
					(sum, item) => sum + item.count,
					0
				)
			},
			errorsByType: {
				nonDeleted: nonDeletedConfsByType.reduce(
					(acc, item) => {
						acc[item.confType] = item.count;
						return acc;
					},
					{} as Record<string, number>
				),
				deleted: deletedConfsByType.reduce(
					(acc, item) => {
						acc[item.confType] = item.count;
						return acc;
					},
					{} as Record<string, number>
				)
			},
			totalConfigurationsByType: [...nonDeletedConfsByType, ...deletedConfsByType].reduce(
				(acc, item) => {
					acc[item.confType] = (acc[item.confType] || 0) + item.count;
					return acc;
				},
				{} as Record<string, number>
			),
			connectionSummaries: await getAllConnectionSummaries(tableName)
		};

		await db
			.insert(summaries)
			.values({
				type: tableName,
				data: JSON.stringify(summary)
			})
			.onConflictDoUpdate({
				target: summaries.type,
				set: {
					data: JSON.stringify(summary)
				}
			});

		return summary;
	});
}

async function getAllConnectionSummaries(
	unifiedTableName: UnifiedTableNames
): Promise<ConnectionSummary[]> {
	const { allConnections } = UnifierMap[unifiedTableName];

	return Promise.all(
		allConnections.map((connection) => connectionSummary(unifiedTableName, connection))
	);
}

async function connectionSummary(
	unifiedTableName: UnifiedTableNames,
	connection: TableConnection<any, any, any>
): Promise<ConnectionSummary> {
	const unifiedTable = UnifierMap[unifiedTableName].table as any;
	const refCol = (unifiedTable as any)[connection.refCol];
	const sourceTableName = getTableConfig(connection.table).name;

	const [
		totalRes,
		matchedActiveRes,
		unmatchedActiveRes,
		approvedUnmatchedActiveRes,
		matchedDeletedRes,
		unmatchedDeletedRes
	] = await Promise.all([
		db.select({ count: count() }).from(connection.table),
		db
			.select({ count: count() })
			.from(connection.table)
			.innerJoin(unifiedTable, eq(refCol, connection.table.id))
			.where(eq(connection.table.deleted, false)),
		db
			.select({ count: count() })
			.from(connection.table)
			.leftJoin(unifiedTable, eq(refCol, connection.table.id))
			.where(and(eq(connection.table.deleted, false), isNull(unifiedTable.id))),
		db
			.select({ count: count() })
			.from(connection.table)
			.leftJoin(unifiedTable, eq(refCol, connection.table.id))
			.innerJoin(uniref as any, eq((uniref as any)[sourceTableName], connection.table.id))
			.innerJoin(unmatchedErrors, eq(unmatchedErrors.uniId, (uniref as any).uniId))
			.where(
				and(
					eq(connection.table.deleted, false),
					isNull(unifiedTable.id),
					eq(unmatchedErrors.allowUnmatched, true)
				)
			),
		db
			.select({ count: count() })
			.from(connection.table)
			.innerJoin(unifiedTable, eq(refCol, connection.table.id))
			.where(eq(connection.table.deleted, true)),
		db
			.select({ count: count() })
			.from(connection.table)
			.leftJoin(unifiedTable, eq(refCol, connection.table.id))
			.where(and(eq(connection.table.deleted, true), isNull(unifiedTable.id)))
	]);

	return {
		tableName: getTableConfig(connection.table).name,
		refCol: connection.refCol.toString(),
		total: totalRes[0]?.count ?? 0,
		matchedActive: matchedActiveRes[0]?.count ?? 0,
		unmatchedActive:
			(unmatchedActiveRes[0]?.count ?? 0) - (approvedUnmatchedActiveRes[0]?.count ?? 0),
		approvedUnmatchedActive: approvedUnmatchedActiveRes[0]?.count ?? 0,
		matchedDeleted: matchedDeletedRes[0]?.count ?? 0,
		unmatchedDeleted: unmatchedDeletedRes[0]?.count ?? 0
	};
}

export interface ConnectionSummary {
	tableName: string;
	refCol: string;
	total: number;
	matchedActive: number;
	unmatchedActive: number;
	approvedUnmatchedActive: number;
	matchedDeleted: number;
	unmatchedDeleted: number;
}

export interface UnifiedErrorSummary {
	itemCounts: {
		nonDeletedWithErrors: number;
		deletedWithErrors: number;
		totalWithErrors: number;
	};
	totalErrorCounts: {
		nonDeleted: number;
		deleted: number;
		total: number;
	};
	errorsByType: {
		nonDeleted: Record<CellError, number>;
		deleted: Record<CellError, number>;
	};
	totalConfigurationsByType: Record<CellError, number>;
	connectionSummaries: ConnectionSummary[];
}
