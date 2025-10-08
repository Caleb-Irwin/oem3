import {
	unifiedGuild,
	unifiedGuildCellConfig,
	unifiedProduct,
	unifiedProductCellConfig,
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
import { productUnifier } from '../routers/product/productUnifier';
import { runProductWorker } from '../routers/product';

export const UnifierMap: {
	[key in UnifiedTableNames]: {
		unifier: Unifier<any, any, any, any, any>;
		runUnifierWorker: RunWorker;
		table: UnifiedTables;
		confTable: CellConfigTable;
		pageUrl: string;
		allConnections: (
			| Unifier<any, any, any, any, any>['conf']['connections']['primaryTable']
			| Exclude<Unifier<any, any, any, any, any>['conf']['connections']['secondaryTable'], null>
			| Unifier<any, any, any, any, any>['conf']['connections']['otherTables'][number]
		)[];
	};
} = {
	unifiedGuild: {
		unifier: guildUnifier,
		runUnifierWorker: runGuildWorker,
		table: unifiedGuild,
		confTable: unifiedGuildCellConfig,
		pageUrl: '/app/guild',
		allConnections: [
			guildUnifier.conf.connections.primaryTable,
			...guildUnifier.conf.connections.otherTables
		]
	},
	unifiedSpr: {
		unifier: sprUnifier,
		runUnifierWorker: runSprWorker,
		table: unifiedSpr,
		confTable: unifiedSprCellConfig,
		pageUrl: '/app/spr',
		allConnections: [
			sprUnifier.conf.connections.primaryTable,
			...sprUnifier.conf.connections.otherTables
		]
	},
	unifiedProduct: {
		unifier: productUnifier as unknown as Unifier<any, any, any, any, any>,
		runUnifierWorker: runProductWorker,
		table: unifiedProduct,
		confTable: unifiedProductCellConfig,
		pageUrl: '/app/product',
		allConnections: [
			productUnifier.conf.connections.primaryTable,
			productUnifier.conf.connections.secondaryTable,
			...productUnifier.conf.connections.otherTables
		]
	}
};
