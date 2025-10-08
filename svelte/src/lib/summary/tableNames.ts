import type { AllSourceTableNames } from '../../../../server/src/unified/types';

export const UnifiedTableNamesReadable: {
	[key in AllSourceTableNames | 'unifiedProduct']: string;
} = {
	unifiedGuild: 'Unified Guild',
	unifiedSpr: 'Unified SPR',
	guildData: 'Guild Data',
	guildInventory: 'Guild Inventory',
	guildFlyer: 'Guild Flyer',
	sprPriceFile: 'SPR Price File',
	sprFlatFile: 'SPR Flat File',
	qb: 'QuickBooks',
	shopify: 'Shopify',
	unifiedProduct: 'Unified Product'
};
