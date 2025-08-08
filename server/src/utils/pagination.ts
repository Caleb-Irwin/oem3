export type PageDirection = 'prev' | 'next';

export interface LikelyNeighbors {
	prev?: number | null;
	next?: number | null;
}

export interface PageResult {
	id: number;
	index: number;
}

// Circular paginate over a list of numeric IDs, honoring explicit neighbor hints when valid
export function paginateCircular(
	ids: number[],
	currentId: number,
	dir: PageDirection,
	hints?: LikelyNeighbors
): PageResult {
	if (ids.length === 0) throw new Error('Cannot paginate an empty list');

	// 1) Honor explicit neighbor if provided and present
	const hinted = hints?.[dir];
	if (typeof hinted === 'number') {
		const hintedIndex = ids.indexOf(hinted);
		if (hintedIndex >= 0) {
			return { id: hinted, index: hintedIndex };
		}
	}

	// 2) If current exists in list, move +/- 1 with wrap
	const currentIndex = ids.indexOf(currentId);
	if (currentIndex >= 0) {
		const delta = dir === 'next' ? 1 : -1;
		const newIndex = (currentIndex + delta + ids.length) % ids.length;
		return { id: ids[newIndex], index: newIndex };
	}

	// 3) Fallback: first or last depending on direction
	const fallbackIndex = dir === 'prev' ? ids.length - 1 : 0;
	return { id: ids[fallbackIndex], index: fallbackIndex };
}

// Pick an initial index preferring a specific ID if present, else first element
export function pickInitialIndex(ids: number[], preferredId?: number | null): number {
	if (typeof preferredId === 'number') {
		const idx = ids.indexOf(preferredId);
		if (idx >= 0) return idx;
	}
	return 0;
}
