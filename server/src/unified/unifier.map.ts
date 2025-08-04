import { unifiedGuild, unifiedGuildCellConfig } from '../db.schema';
import { guildUnifier } from '../routers/guild/guildUnifier';
import type { createUnifier } from './unifier';
import type { UnifiedTableNames, UnifiedTables, CellConfigTable } from './types';

export const UnifierMap: {
	[key in UnifiedTableNames]: {
		unifier: ReturnType<typeof createUnifier>;
		table: UnifiedTables;
		confTable: CellConfigTable;
		pageUrl: string;
	};
} = {
	unifiedGuild: {
		unifier: guildUnifier,
		table: unifiedGuild,
		confTable: unifiedGuildCellConfig,
		pageUrl: '/app/guild'
	}
};
