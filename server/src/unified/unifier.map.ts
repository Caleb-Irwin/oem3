import {
	unifiedGuild,
	unifiedGuildCellConfig,
	unifiedSpr,
	unifiedSprCellConfig
} from '../db.schema';
import { guildUnifier } from '../routers/guild/guildUnifier';
import { sprUnifier } from '../routers/spr/sprUnifier';
import type { Unifier } from './unifier';
import type { UnifiedTableNames, UnifiedTables, CellConfigTable } from './types';
import { runGuildWorker } from '../routers/guild';
import { runSprWorker } from '../routers/spr';
import type { RunWorker } from '../utils/managedWorker';

export const UnifierMap: {
	[key in UnifiedTableNames]: {
		unifier: Unifier<any, any, any, any, any>;
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
	},
	unifiedSpr: {
		unifier: sprUnifier,
		runUnifierWorker: runSprWorker,
		table: unifiedSpr,
		confTable: unifiedSprCellConfig,
		pageUrl: '/app/spr'
	}
};
