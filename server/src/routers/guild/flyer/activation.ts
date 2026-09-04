import { guildFlyerOverrideEnum, type guildFlyerSet } from './table';

export const DAY_MS = 24 * 60 * 60 * 1000;

export const guildFlyerOverrideValues = guildFlyerOverrideEnum.enumValues;

export type FlyerSet = typeof guildFlyerSet.$inferSelect;
export type FlyerOverride = FlyerSet['override'];
export type FlyerStatus = 'active' | 'upcoming' | 'expired' | 'forcedOn' | 'forcedOff';

/**
 * The end date in a flyer file is the last day the flyer runs, so the flyer
 * stays active until the end of that day.
 */
export const flyerEndsAt = (set: Pick<FlyerSet, 'endDate'>) =>
	set.endDate === null ? null : set.endDate + DAY_MS;

export const isFlyerActive = (
	set: Pick<FlyerSet, 'override' | 'startDate' | 'endDate' | 'deleted'>,
	now = Date.now()
) => {
	if (set.deleted) return false;
	if (set.override === 'active') return true;
	if (set.override === 'inactive') return false;

	const endsAt = flyerEndsAt(set);
	if (set.startDate === null || endsAt === null) return false;
	return now >= set.startDate && now < endsAt;
};

export const flyerStatus = (
	set: Pick<FlyerSet, 'override' | 'startDate' | 'endDate' | 'deleted'>,
	now = Date.now()
): FlyerStatus => {
	if (set.override === 'active') return 'forcedOn';
	if (set.override === 'inactive') return 'forcedOff';
	if (isFlyerActive(set, now)) return 'active';
	if (set.startDate !== null && now < set.startDate) return 'upcoming';
	return 'expired';
};

/**
 * The next moment an automatic flyer starts or stops, so activation can be
 * re-run exactly when it changes instead of being polled.
 */
export const nextFlyerBoundary = (
	sets: Pick<FlyerSet, 'override' | 'startDate' | 'endDate' | 'deleted'>[],
	now = Date.now()
) => {
	let next: number | null = null;
	for (const set of sets) {
		if (set.deleted || set.override !== 'auto') continue;
		for (const time of [set.startDate, flyerEndsAt(set)]) {
			if (time !== null && time > now && (next === null || time < next)) next = time;
		}
	}
	return next;
};

/**
 * When an item is in more than one active flyer the customer gets the best
 * advertised price; ties go to the flyer that started most recently.
 */
export const isBetterFlyerOffer = (
	candidate: { priceCents: number | null; startDate: number | null; flyerNumber: number | null },
	current: { priceCents: number | null; startDate: number | null; flyerNumber: number | null }
) => {
	if (candidate.priceCents !== current.priceCents) {
		if (candidate.priceCents === null) return false;
		if (current.priceCents === null) return true;
		return candidate.priceCents < current.priceCents;
	}
	if (candidate.startDate !== current.startDate) {
		if (candidate.startDate === null) return false;
		if (current.startDate === null) return true;
		return candidate.startDate > current.startDate;
	}
	return (candidate.flyerNumber ?? 0) > (current.flyerNumber ?? 0);
};
