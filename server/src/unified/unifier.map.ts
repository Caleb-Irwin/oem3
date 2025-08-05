import { unifiedGuild, unifiedGuildCellConfig } from '../db.schema';
import { guildUnifier } from '../routers/guild/guildUnifier';
import type { Unifier } from './unifier';
import type { UnifiedTableNames, UnifiedTables, CellConfigTable } from './types';
import { runGuildWorker } from '../routers/guild';
import type { RunWorker } from '../utils/managedWorker';

export const UnifierMap: {
	[key in UnifiedTableNames]: {
		unifier: Unifier<any, any>;
		runUnifierWorker: RunWorker;
		table: UnifiedTables;
		confTable: CellConfigTable;
		pageUrl: string;
	};
} = {
	unifiedGuild: {
		unifier: guildUnifier,
		runUnifierWorker: runGuildWorker,
		table: unifiedGuild,
		confTable: unifiedGuildCellConfig,
		pageUrl: '/app/guild'
	}
};
