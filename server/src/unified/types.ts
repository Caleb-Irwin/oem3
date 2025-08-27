import type {
	guildData,
	guildFlyer,
	guildInventory,
	sprFlatFile,
	sprPriceFile,
	unifiedGuild,
	unifiedGuildCellConfig,
	unifiedSpr,
	unifiedSprCellConfig
} from '../db.schema';

export type UnifiedTables = typeof unifiedGuild | typeof unifiedSpr;
export const UnifiedTableNamesArray = ['unifiedGuild', 'unifiedSpr'] as const;
export type UnifiedTableNames = (typeof UnifiedTableNamesArray)[number];
export const PrimarySourceTableNamesArray = ['unifiedGuild', 'guildData', 'sprPriceFile'] as const;
export type PrimarySourceTables = typeof unifiedGuild | typeof guildData | typeof sprPriceFile;
// export type SecondarySourceTables = typeof unifiedSPR
export const OtherSourceTableNamesArray = [
	'guildInventory',
	'guildFlyer',
	'sprFlatFile',
	'unifiedSpr'
] as const;
export type OtherSourceTables =
	| typeof guildInventory
	| typeof guildFlyer
	| typeof sprFlatFile
	| typeof unifiedSpr;

export type AllSourceTables = PrimarySourceTables | OtherSourceTables;
export const AllSourceTableNamesArray = [
	...PrimarySourceTableNamesArray,
	...OtherSourceTableNamesArray
] as const;
export type AllSourceTableNames = (typeof AllSourceTableNamesArray)[number];

export type CellConfigTable = typeof unifiedGuildCellConfig | typeof unifiedSprCellConfig;

// Generic types that work with any unified table's config table
export type CellConfigRowInsert = CellConfigTable['$inferInsert'];
export type CellConfigRowSelect = CellConfigTable['$inferSelect'];
