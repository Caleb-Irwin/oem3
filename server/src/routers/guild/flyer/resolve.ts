import { removeNaN } from '../../../utils/changeset.helpers';
import { chunk } from '../../../utils/chunk';
import { guildFlyer, guildFlyerItem, guildFlyerSet } from './table';
import { isBetterFlyerOffer, isFlyerActive } from './activation';
import * as xlsx from 'xlsx';
import { eq, inArray, not } from 'drizzle-orm';
import { type db as DB, type Tx } from '../../../db';

/** One flyer's worth of rows out of an uploaded file. */
interface ParsedFlyer {
	key: string;
	flyerNumber: number | null;
	startDate: number | null;
	endDate: number | null;
	sourceFile: number;
	items: (typeof guildFlyerItem.$inferInsert)[];
}

/**
 * A file may hold more than one flyer, so rows are grouped by flyer number (or
 * by date range when the file has no flyer number) instead of being treated as
 * a single flyer.
 */
export const parseFlyerFile = (dataUrl: string, sourceFile: number): ParsedFlyer[] => {
	const workbook = xlsx.read(dataUrl.slice(dataUrl.indexOf(';base64,') + 8)),
		worksheet = workbook.Sheets[workbook.SheetNames[0]],
		rawItems = xlsx.utils.sheet_to_json(worksheet) as GuildFlyerRaw[];

	const flyers = new Map<string, ParsedFlyer>();

	for (const raw of rawItems) {
		const flyerNumber = removeNaN(parseInt(raw['Flyer # '])),
			startDate = parseFlyerDate(raw['Date Flyer Starts ']),
			endDate = parseFlyerDate(raw['Date Flyer Ends']),
			key = flyerKey(flyerNumber, startDate, endDate);

		let flyer = flyers.get(key);
		if (!flyer) {
			flyer = { key, flyerNumber, startDate, endDate, sourceFile, items: [] };
			flyers.set(key, flyer);
		}

		flyer.items.push({
			set: 0, // filled in once the flyer row exists
			gid: raw['Item Stock #'].toString(),
			vendorCode: raw["Manufacture's Code"],
			flyerCostCents: removeNaN(Math.round(parseFloat(raw['Flyer Cost']) * 100)),
			flyerPriceL0Cents: removeNaN(Math.round(parseFloat(raw['Flyer Price Level 0']) * 100)),
			flyerPriceL1Cents: removeNaN(Math.round(parseFloat(raw['Flyer Price Level 1']) * 100)),
			flyerPriceRetailCents: removeNaN(
				Math.round(parseFloat(raw['Flyer Price Retail Level']) * 100)
			),
			regularPriceL0Cents: removeNaN(Math.round(parseFloat(raw['Regular Price Level 0']) * 100)),
			regularPriceL1Cents: removeNaN(Math.round(parseFloat(raw['Regular Price Level 1']) * 100))
		});
	}

	return Array.from(flyers.values());
};

export const parseFlyerDate = (value: string) => {
	if (!value) return null;
	const date = new Date(value + ': GMT-0600').valueOf();
	return isNaN(date) ? null : date;
};

export const flyerKey = (
	flyerNumber: number | null,
	startDate: number | null,
	endDate: number | null
) => (flyerNumber === null ? `d:${startDate ?? ''}-${endDate ?? ''}` : flyerNumber.toString());

/**
 * Adds or replaces one flyer. Flyers that are not in the uploaded file are left
 * alone, which is what lets several flyers run at once.
 */
export const importFlyer = async (db: Tx | typeof DB, flyer: ParsedFlyer) => {
	const timeStamp = Date.now();

	const set = (
		await db
			.insert(guildFlyerSet)
			.values({
				key: flyer.key,
				flyerNumber: flyer.flyerNumber,
				startDate: flyer.startDate,
				endDate: flyer.endDate,
				sourceFile: flyer.sourceFile,
				itemCount: flyer.items.length,
				deleted: false,
				lastUpdated: timeStamp
			})
			.onConflictDoUpdate({
				target: guildFlyerSet.key,
				set: {
					flyerNumber: flyer.flyerNumber,
					startDate: flyer.startDate,
					endDate: flyer.endDate,
					sourceFile: flyer.sourceFile,
					itemCount: flyer.items.length,
					deleted: false,
					lastUpdated: timeStamp
				}
			})
			.returning({ id: guildFlyerSet.id })
	)[0];

	await db.delete(guildFlyerItem).where(eq(guildFlyerItem.set, set.id));
	for (const items of chunk(flyer.items))
		await db.insert(guildFlyerItem).values(items.map((item) => ({ ...item, set: set.id })));
};

/** Recomputes which flyers are running right now and records it on each flyer. */
export const applyActivation = async (db: Tx | typeof DB, now = Date.now()) => {
	const sets = await db.query.guildFlyerSet.findMany({ where: not(guildFlyerSet.deleted) });

	const active = sets.filter((set) => isFlyerActive(set, now)),
		activeIds = new Set(active.map((set) => set.id));

	const turnedOn = sets.filter((set) => activeIds.has(set.id) && !set.active).map((set) => set.id),
		turnedOff = sets.filter((set) => !activeIds.has(set.id) && set.active).map((set) => set.id);

	if (turnedOn.length > 0)
		await db
			.update(guildFlyerSet)
			.set({ active: true, lastUpdated: now })
			.where(inArray(guildFlyerSet.id, turnedOn));
	if (turnedOff.length > 0)
		await db
			.update(guildFlyerSet)
			.set({ active: false, lastUpdated: now })
			.where(inArray(guildFlyerSet.id, turnedOff));

	return active;
};

/** Collapses the items of every active flyer down to one winning row per gid. */
export const resolveFlyerItems = async (
	db: Tx | typeof DB,
	sets: (typeof guildFlyerSet.$inferSelect)[]
) => {
	const resolved = new Map<string, typeof guildFlyer.$inferInsert>();
	if (sets.length === 0) return [];

	const items = await db.query.guildFlyerItem.findMany({
		where: inArray(
			guildFlyerItem.set,
			sets.map((set) => set.id)
		)
	});
	const setsById = new Map(sets.map((set) => [set.id, set]));

	for (const item of items) {
		const set = setsById.get(item.set);
		if (!set) continue;

		const current = resolved.get(item.gid);
		if (
			current &&
			!isBetterFlyerOffer(
				{
					priceCents: item.flyerPriceL1Cents,
					startDate: set.startDate,
					flyerNumber: set.flyerNumber
				},
				{
					priceCents: current.flyerPriceL1Cents ?? null,
					startDate: current.startDate ?? null,
					flyerNumber: current.flyerNumber ?? null
				}
			)
		)
			continue;

		resolved.set(item.gid, {
			gid: item.gid,
			set: set.id,
			flyerNumber: set.flyerNumber,
			startDate: set.startDate,
			endDate: set.endDate,
			vendorCode: item.vendorCode,
			flyerCostCents: item.flyerCostCents,
			flyerPriceL0Cents: item.flyerPriceL0Cents,
			flyerPriceL1Cents: item.flyerPriceL1Cents,
			flyerPriceRetailCents: item.flyerPriceRetailCents,
			regularPriceL0Cents: item.regularPriceL0Cents,
			regularPriceL1Cents: item.regularPriceL1Cents,
			lastUpdated: 0
		});
	}

	return Array.from(resolved.values());
};

export interface GuildFlyerRaw {
	'Flyer # ': string;
	'Date Flyer Starts ': string;
	'Date Flyer Ends': string;
	"Manufacture's Code": string;
	'Item Stock #': string;
	'Flyer Cost': string;
	'Flyer Price Level 0': string;
	'Flyer Price Level 1': string;
	'Flyer Price Retail Level': string;
	'Regular Price Level 0': string;
	'Regular Price Level 1': string;
}
