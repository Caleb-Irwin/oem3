import type { client } from '$lib/client';

export type PriceChangeData = Awaited<ReturnType<typeof client.priceChanges.get.query>>;
export type PriceChangeItem = PriceChangeData['pending'][number];
export type CustomApproval = PriceChangeData['customApprovals'][number];
export type PriceChangeCategory = PriceChangeData['category'];
export type PriceChangeView = 'review' | 'approved' | 'rejected' | 'exported' | 'custom';

export const VIEWS: PriceChangeView[] = ['review', 'approved', 'rejected', 'exported', 'custom'];

/**
 * The review state this page keeps in the URL hash, as `#category/view`, so a refresh
 * (or a shared link) lands back on the same scope and screen.
 */
export function parseReviewHash(hash: string): {
	category: PriceChangeCategory;
	view: PriceChangeView;
} {
	const [rawCategory = '', rawView = ''] = decodeURIComponent(hash.replace(/^#/, '')).split('/');
	const category = CATEGORIES.some((option) => option.value === rawCategory)
		? (rawCategory as PriceChangeCategory)
		: 'all';
	const view = VIEWS.find((option) => option === rawView) ?? 'review';
	return { category, view };
}

export function reviewHash(category: PriceChangeCategory, view: PriceChangeView): string {
	return `#${category}/${view}`;
}
export type PriceChangeExport = Awaited<
	ReturnType<typeof client.priceChanges.exports.list.query>
>[number];

export const CATEGORIES: { value: PriceChangeCategory; label: string; hint: string }[] = [
	{ value: 'flyer', label: 'Active Flyer', hint: 'Items priced by a flyer that is running now' },
	{ value: 'guild', label: 'Guild Pricing', hint: 'Products whose price comes from Guild' },
	{ value: 'spr', label: 'SPR Pricing', hint: 'Products whose price comes from SPR' },
	{ value: 'all', label: 'All', hint: 'Every product with a QuickBooks price to change' }
];

export const formatPercent = (percent: number) =>
	`${percent > 0 ? '+' : ''}${percent.toFixed(percent > -10 && percent < 10 ? 1 : 0)}%`;

/** The custom price columns, as they read to a person. */
export const CUSTOM_PRICE_LABELS = {
	onlinePriceCents: 'Online price',
	targetQuickBooksPriceCents: 'QuickBooks price'
} as const;
