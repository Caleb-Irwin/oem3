/** One exported item, as QuickBooks needs to see it in an Excel/CSV import. */
export interface QuickBooksPriceCsvRow {
	qbId: string;
	qbAccount: string | null;
	preferredVendor: string | null;
	previousPriceCents: number;
	newPriceCents: number;
}

function escapeField(value: string): string {
	return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Builds the QuickBooks item import CSV. In revert mode every row carries the price the item
 * held before the export instead of the new one, which is how a flyer's pricing gets put back
 * once the flyer is over.
 *
 * Import it with File > Utilities > Import > Excel Files, with duplicate handling set to
 * "replace, except blank fields".
 */
export function buildQuickBooksPriceCsv(
	items: QuickBooksPriceCsvRow[],
	{ revert = false }: { revert?: boolean } = {}
): string {
	const header = 'TYPE,ACCOUNT,NAME,PRICE/AMOUNT,PREFERRED VENDOR';
	const rows = items.map((item) =>
		[
			'Inventory Part',
			escapeField(item.qbAccount ?? ''),
			escapeField(item.qbId),
			((revert ? item.previousPriceCents : item.newPriceCents) / 100).toFixed(2),
			escapeField(item.preferredVendor ?? '')
		].join(',')
	);
	return [header, ...rows].join('\n');
}
