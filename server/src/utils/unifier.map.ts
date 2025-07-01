import { unifiedGuild, unifiedGuildCellConfig } from '../db.schema';
import { guildUnifier } from '../routers/guild/guildUnifier';
import type { CellConfigTable, createUnifier, UnifiedTableNames, UnifiedTables } from './unifier';

export const UnifierMap: {
	[key in UnifiedTableNames]: {
		unifier: ReturnType<typeof createUnifier>;
		table: UnifiedTables;
		confTable: CellConfigTable;
	};
} = {
	unifiedGuild: { unifier: guildUnifier, table: unifiedGuild, confTable: unifiedGuildCellConfig }
};
