import type { AllSourceTableNames } from '../../../../server/src/unified/types';

export const UnifiedTableNamesReadable: {
	[key in AllSourceTableNames]: string;
} = {
	unifiedGuild: 'Unified Guild',
	guildData: 'Guild Data',
	guildInventory: 'Guild Inventory',
	guildFlyer: 'Guild Flyer'
};
