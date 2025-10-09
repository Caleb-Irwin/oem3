import { eventSubscription } from '../utils/eventSubscription';
import type { OnUpdateCallback } from '../unified/unifier';

export const ColToTableName = {
	dataRow: 'guildData',
	inventoryRow: 'guildInventory',
	flyerRow: 'guildFlyer',
	sprPriceFileRow: 'sprPriceFile',
	sprFlatFileRow: 'sprFlatFile',
	qbRow: 'qb',
	shopifyRow: 'shopify',
	unifiedGuildRow: 'unifiedGuild',
	unifiedSprRow: 'unifiedSpr'
} as const;

const { update, createSub } = eventSubscription();

export const updateUnifiedTopicByUniId = update;
export const createUnifiedSub = createSub;

export const unifiedOnUpdateCallback: OnUpdateCallback = (uniId) =>
	updateUnifiedTopicByUniId(uniId.toString());
