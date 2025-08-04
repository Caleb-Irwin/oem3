import { getTableName, relations } from 'drizzle-orm';
import {
	bigint,
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	type AnyPgColumn,
	type AnyPgTable,
	type PgEnum
} from 'drizzle-orm/pg-core';
import type { UnifiedTableNames } from './types';

export const CellSettingArray = [
	'setting:custom',
	'setting:approve',
	'setting:approveCustom'
] as const;
export type CellSetting = (typeof CellSettingArray)[number];
export const CellErrorArray = [
	'error:multipleOptions',
	'error:missingValue',
	'error:needsApproval',
	'error:needsApprovalCustom',
	'error:matchWouldCauseDuplicate',
	'error:shouldNotBeNull',
	'error:invalidDataType',
	'error:contradictorySources',
	'error:canNotBeSetToNull',
	'error:canNotBeSetToWrongType'
] as const;
export type CellError = (typeof CellErrorArray)[number];

export const cellConfigType = pgEnum('cellConfigType', [
	...CellSettingArray,
	...CellErrorArray
] as const);

export type CellConfigType = (typeof cellConfigType.enumValues)[number];
export const UnifiedTableNamesArray = ['unifiedGuild'] as UnifiedTableNames[];

export function cellConfigTable<COLS extends [string, ...string[]]>({
	originalTable,
	primaryKey,
	columnEnum
}: {
	originalTable: AnyPgTable;
	primaryKey: AnyPgColumn<{ columnType: 'PgInteger' | 'PgSerial' }>;
	columnEnum: PgEnum<COLS>;
}) {
	const tableName = `${getTableName(originalTable)}CellConfig`;

	const table = pgTable(
		tableName,
		{
			id: serial('id').primaryKey(),
			refId: integer('rowId')
				.notNull()
				.references(() => primaryKey, { onDelete: 'cascade' }),
			col: columnEnum('col').notNull(),
			confType: cellConfigType('confType').notNull(),
			value: text('value'),
			lastValue: text('lastValue'),
			options: text('options'), // JSON Array
			message: text('message'), // User Viewable
			otherData: text('otherData'), // JSON
			resolved: boolean('resolved'),
			notes: text('notes'), // User Viewable (HTML Encoded)
			created: bigint('created', { mode: 'number' }).notNull()
		},
		(genericTable) => [
			index(`${tableName}_refId_idx`).on(genericTable.refId),
			index(`${tableName}_col_idx`).on(genericTable.col),
			index(`${tableName}_confType_idx`).on(genericTable.confType),
			index(`${tableName}_created_idx`).on(genericTable.created)
		]
	);

	const tableRelations = relations(table, ({ one }) => ({
		ref: one(table, { fields: [table.refId], references: [primaryKey] })
	}));

	return {
		table,
		relations: tableRelations
	} as const;
}
