type QueueItem = { id: number; status: string; skippedAt?: number | null };

/** Preserve back navigation while sourcing pending work from the full server queue. */
export function restoreReviewQueue<T extends QueueItem>(
	snapshot: T[],
	index: number,
	kept: T[],
	pending: T[]
): { queue: T[]; index: number } {
	const previous = snapshot[index];
	const historyIds = new Set(snapshot.slice(0, index).map((item) => item.id));
	const history = kept.filter((item) => historyIds.has(item.id) && item.status !== 'pending');
	const active = kept.find((item) => item.id === previous?.id);
	const retainCurrent = active && (active.skippedAt ?? null) === (previous?.skippedAt ?? null);
	const decidedAhead = kept.filter(
		(item) => !historyIds.has(item.id) && item.id !== previous?.id && item.status !== 'pending'
	);
	const prefix = [...history, ...(retainCurrent ? [active] : []), ...decidedAhead];
	const prefixIds = new Set(prefix.map((item) => item.id));
	return {
		queue: [...prefix, ...pending.filter((item) => !prefixIds.has(item.id))],
		index: history.length
	};
}
