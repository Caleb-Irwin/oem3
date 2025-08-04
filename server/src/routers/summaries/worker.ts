import { and, eq, inArray, countDistinct, isNull, or, count } from 'drizzle-orm';
import { db } from '../../db';
import type { UnifiedTableNames } from '../../unified/unifier';
import { UnifierMap } from '../../unified/unifier.map';
import { work } from '../../utils/workerBase';
import { CellErrorArray, type CellError, summaries } from '../../db.schema';

work({
	process: async ({}) => {
		await updateUnifiedSummary('unifiedGuild');
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
			)
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
}
