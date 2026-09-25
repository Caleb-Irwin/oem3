import type { AllSourceTableNames } from '../../../../server/src/unified/types';

export const UnifiedTableNamesReadable: {
	[key in AllSourceTableNames | 'unifiedProduct']: string;
} = {
	unifiedGuild: 'Unified Guild',
	unifiedSpr: 'Unified Novexco',
	guildData: 'Guild Data',
	guildFlyer: 'Guild Flyer',
	sprPriceFile: 'Novexco Price File',
	sprFlatFile: 'Novexco Flat File',
	qb: 'QuickBooks',
	shopify: 'Shopify',
	unifiedProduct: 'Unified Product'
};
