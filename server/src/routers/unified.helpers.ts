import { eventSubscription } from '../utils/eventSubscription';

export const ColToTableName = {
	dataRow: 'guildData',
	inventoryRow: 'guildInventory',
	flyerRow: 'guildFlyer'
} as const;

const { update, createSub } = eventSubscription();

export const updateUnifiedTopicByUniId = update;
export const createUnifiedSub = createSub;
