import type { sprPriceFile } from './table';

/**
 * Novexco often re-codes an item, listing it under a new code while the old one is discontinued.
 * Rows sharing an Etilize product, unit, pack size, supplier and supplier SKU are twins: the
 * preferred one is kept as is, the others get `duplicateOf` pointing at it. The supplier SKU
 * matters, as Etilize sometimes files different products (e.g. English/French stamps) under one ID.
 */
export function findDuplicates(items: (typeof sprPriceFile.$inferInsert)[]) {
	const groups = new Map<string, (typeof sprPriceFile.$inferInsert)[]>();
	for (const item of items) {
		if (!item.etilizeId || !item.supplierName || !item.supplierSku) continue;
		const key = [item.etilizeId, item.um, item.unitsPerPack, item.supplierName, item.supplierSku]
			.map((v) => String(v ?? ''))
			.join('|');
		const group = groups.get(key) ?? [];
		group.push(item);
		groups.set(key, group);
	}

	for (const group of groups.values()) {
		if (group.length < 2) continue;
		const [preferred, ...duplicates] = group.toSorted(
			(a, b) =>
				Number(b.status === 'Active') - Number(a.status === 'Active') ||
				Number(!!b.guildCode) - Number(!!a.guildCode) ||
				(b.inventory ?? 0) - (a.inventory ?? 0) ||
				Number(!!b.sprcSku) - Number(!!a.sprcSku) ||
				a.novexcoCode!.localeCompare(b.novexcoCode!)
		);
		preferred.duplicateCodes = duplicates
			.map((d) => d.novexcoCode!)
			.sort()
			.join(',');
		for (const duplicate of duplicates) duplicate.duplicateOf = preferred.novexcoCode;
	}
}
