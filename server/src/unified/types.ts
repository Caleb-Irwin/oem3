import type { db as DB, Tx } from '../db';
import type {
	guildData,
	guildFlyer,
	guildInventory,
	qb,
	shopify,
	sprFlatFile,
	sprPriceFile,
	unifiedGuild,
	unifiedGuildCellConfig,
	unifiedProduct,
	unifiedProductCellConfig,
	unifiedSpr,
	unifiedSprCellConfig
} from '../db.schema';
import type { InsertHistoryRowOptions } from '../utils/history';
import type { OnUpdateCallback } from './unifier';

export type UnifiedTables = typeof unifiedGuild | typeof unifiedSpr | typeof unifiedProduct;
export const UnifiedTableNamesArray = ['unifiedGuild', 'unifiedSpr', 'unifiedProduct'] as const;
export type UnifiedTableNames = (typeof UnifiedTableNamesArray)[number];
export const PrimarySourceTableNamesArray = ['unifiedGuild', 'guildData', 'sprPriceFile'] as const;
export type PrimarySourceTables = typeof unifiedGuild | typeof guildData | typeof sprPriceFile;
export const SecondarySourceTableNamesArray = ['unifiedSpr'] as const;
export type SecondarySourceTables = typeof unifiedSpr;
export const OtherSourceTableNamesArray = [
	'guildInventory',
	'guildFlyer',
	'sprFlatFile',
	'qb',
	'shopify'
] as const;
export type OtherSourceTables =
	| typeof guildInventory
	| typeof guildFlyer
	| typeof sprFlatFile
	| typeof qb
	| typeof shopify;

export type AllSourceTables = PrimarySourceTables | SecondarySourceTables | OtherSourceTables;
export const AllSourceTableNamesArray = [
	...PrimarySourceTableNamesArray,
	...SecondarySourceTableNamesArray,
	...OtherSourceTableNamesArray
] as const;
export type AllSourceTableNames = (typeof AllSourceTableNamesArray)[number];

export type CellConfigTable =
	| typeof unifiedGuildCellConfig
	| typeof unifiedSprCellConfig
	| typeof unifiedProductCellConfig;

// Generic types that work with any unified table's config table
export type CellConfigRowInsert = CellConfigTable['$inferInsert'];
export type CellConfigRowSelect = CellConfigTable['$inferSelect'];

export type ConnectionTable<
	RowType,
	TableType extends UnifiedTables,
	Primary extends PrimarySourceTables = PrimarySourceTables,
	Other extends OtherSourceTables = OtherSourceTables,
	Secondary extends SecondarySourceTables | null = null
> =
	| PrimarySecondaryTableConnection<RowType, TableType, Primary>
	| TableConnection<RowType, TableType, Other>
	| (Secondary extends SecondarySourceTables
			? PrimarySecondaryTableConnection<RowType, TableType, Secondary>
			: never);

export type AnyConnection = ConnectionTable<any, any, any, any>;

export interface TableConnection<
	RowType,
	UnifiedTable extends UnifiedTables,
	T extends PrimarySourceTables | SecondarySourceTables | OtherSourceTables
> {
	table: T;
	refCol: keyof UnifiedTable;
	findConnections: (row: RowType, db: typeof DB | Tx) => Promise<number[]>; // Should not return deleted items
	isDeleted: (row: RowType) => boolean;
	allowDeleted?: boolean;
}

export interface PrimarySecondaryTableConnection<
	RowType,
	UnifiedTable extends UnifiedTables,
	T extends PrimarySourceTables | SecondarySourceTables
> extends TableConnection<RowType, UnifiedTable, T> {
	newRowTransform: (row: T['$inferSelect'], lastUpdated: number) => UnifiedTable['$inferInsert'];
}

export interface Connections<
	RowType,
	UnifiedTable extends UnifiedTables,
	Primary extends PrimarySourceTables = PrimarySourceTables,
	Secondary extends SecondarySourceTables | null = null,
	Other extends OtherSourceTables = OtherSourceTables
> {
	primaryTable: PrimarySecondaryTableConnection<RowType, UnifiedTable, Primary>;
	secondaryTable: Secondary extends SecondarySourceTables
		? PrimarySecondaryTableConnection<RowType, UnifiedTable, Secondary>
		: null;
	otherTables: TableConnection<RowType, UnifiedTable, Other>[];
}

export type _UpdateRow = (conf: {
	id: number;
	db: Tx | typeof DB;
	onUpdateCallback: OnUpdateCallback;
	nestedMode?: boolean;
	removeAutoMatch?: boolean;
}) => Promise<{
	history: InsertHistoryRowOptions<any> | null;
	newErrors: any[]; //TODO?
}>;
