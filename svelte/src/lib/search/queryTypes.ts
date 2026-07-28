import type { QueryType } from '../../../../server/src/routers/search';

/** Most searches are for a unified product, so that is what an unqualified search means. */
export const DEFAULT_QUERY_TYPE: QueryType = 'unifiedProduct';

export const queryTypeOptions: { value: QueryType; label: string }[] = [
	{ value: 'unifiedProduct', label: 'Unified Products' },
	{ value: 'all', label: 'All Items' },
	{ value: 'unifiedGuild', label: 'Unified Guild' },
	{ value: 'unifiedSpr', label: 'Unified SPR' },
	{ value: 'qb', label: 'QuickBooks' },
	{ value: 'shopify', label: 'Shopify' },
	{ value: 'guildData', label: 'Guild Data' },
	{ value: 'guildInventory', label: 'Guild Inventory' },
	{ value: 'guildFlyer', label: 'Guild Flyer' },
	{ value: 'sprPriceFile', label: 'SPR Price' },
	{ value: 'sprFlatFile', label: 'SPR Info' }
];

export const isQueryType = (value: string | null): value is QueryType =>
	queryTypeOptions.some((option) => option.value === value);

export const queryTypeLabel = (value: QueryType) =>
	queryTypeOptions.find((option) => option.value === value)?.label ?? 'All Items';
