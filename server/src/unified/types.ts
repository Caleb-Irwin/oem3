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
export type PrimarySourceTables = typeof unifiedGuild | typeof guildData;
// export type SecondarySourceTables = typeof unifiedSPR
export type OtherSourceTables = typeof guildInventory | typeof guildFlyer;

export type CellConfigTable = typeof unifiedGuildCellConfig;

// Generic types that work with any unified table's config table
export type CellConfigRowInsert = CellConfigTable['$inferInsert'];
export type CellConfigRowSelect = CellConfigTable['$inferSelect'];
