import type {
	guildData,
	guildFlyer,
	guildInventory,
	unifiedGuild,
	unifiedGuildCellConfig
} from '../db.schema';

export type UnifiedTables = typeof unifiedGuild;
export const UnifiedTableNamesArray = ['unifiedGuild'] as const;
export type UnifiedTableNames = (typeof UnifiedTableNamesArray)[number];
export const PrimarySourceTableNamesArray = ['unifiedGuild', 'guildData'] as const;
export type PrimarySourceTables = typeof unifiedGuild | typeof guildData;
// export type SecondarySourceTables = typeof unifiedSPR
export const OtherSourceTableNamesArray = ['guildInventory', 'guildFlyer'] as const;
export type OtherSourceTables = typeof guildInventory | typeof guildFlyer;

export type AllSourceTables = PrimarySourceTables | OtherSourceTables;
export const AllSourceTableNamesArray = [
	...PrimarySourceTableNamesArray,
	...OtherSourceTableNamesArray
];
export type AllSourceTableNames = (typeof AllSourceTableNamesArray)[number];

export type CellConfigTable = typeof unifiedGuildCellConfig;

// Generic types that work with any unified table's config table
export type CellConfigRowInsert = CellConfigTable['$inferInsert'];
export type CellConfigRowSelect = CellConfigTable['$inferSelect'];
