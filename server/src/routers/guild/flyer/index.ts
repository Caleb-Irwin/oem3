import { TRPCError } from '@trpc/server';
import { generalProcedure, router, viewerProcedure } from '../../../trpc';
import { fileProcedures, type CloudDownloadFile } from '../../../utils/files';
import { managedWorker } from '../../../utils/managedWorker';
import * as xlsx from 'xlsx';
import { KV } from '../../../utils/kv';
import type { GuildFlyerRaw } from './resolve';
import { ensureSheetCols } from '../../../utils/ensureSheetCols';
import { getFlyerFileNames } from './source';
import { db } from '../../../db';
import { guildFlyerSet } from './table';
import { asc, eq, not } from 'drizzle-orm';
import { z } from 'zod';
import { eventSubscription } from '../../../utils/eventSubscription';
import {
	flyerStatus,
	guildFlyerOverrideValues,
	isFlyerActive,
	nextFlyerBoundary
} from './activation';

const { worker, runWorker, hook } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'guildFlyer'
);

export const guildFlyerHook = hook;

const { update: updateSets, createSub: createSetsSub } = eventSubscription();

/** How many of the newest flyer files on Guild's server a cloud sync considers. */
const CLOUD_FLYER_FILE_COUNT = 4;
/** Never sleep longer than this, so a missed timer only delays activation by a few hours. */
const MAX_ACTIVATION_DELAY = 6 * 60 * 60 * 1000;
/** Keeps a failing worker from being re-triggered in a tight loop. */
const MIN_RESOLVE_INTERVAL = 60 * 1000;

const flyerSourceUrl = 'https://www.guildstationers.com/images/+Public/MA-Data/+Vezina_J/';

const getSets = async () => {
	const now = Date.now(),
		sets = await db.query.guildFlyerSet.findMany({
			where: not(guildFlyerSet.deleted),
			orderBy: [asc(guildFlyerSet.startDate), asc(guildFlyerSet.id)],
			with: {
				// The file column alone is not enough to tell two uploads apart in the UI.
				sourceFileContent: { columns: { id: true, name: true } }
			}
		});

	return sets.map(({ sourceFileContent, ...set }) => ({
		...set,
		sourceFileName: sourceFileContent?.name ?? null,
		isActive: isFlyerActive(set, now),
		status: flyerStatus(set, now)
	}));
};

let activationTimer: ReturnType<typeof setTimeout> | null = null,
	lastResolveTriggered = 0;

/**
 * Re-resolves the active flyers whenever the applied state no longer matches
 * the flyer dates, then sleeps until the next start/end date.
 */
const checkActivation = async () => {
	if (activationTimer) clearTimeout(activationTimer);
	activationTimer = null;

	try {
		const now = Date.now(),
			sets = await db.query.guildFlyerSet.findMany({ where: not(guildFlyerSet.deleted) });

		const stale = sets.some((set) => isFlyerActive(set, now) !== set.active);
		if (stale && now - lastResolveTriggered > MIN_RESOLVE_INTERVAL) {
			lastResolveTriggered = now;
			// The post-run hook schedules the next check once the worker is done.
			await runWorker({});
			return;
		}

		const boundary = nextFlyerBoundary(sets, now),
			delay = Math.min(
				Math.max((boundary ?? now + MAX_ACTIVATION_DELAY) - now, MIN_RESOLVE_INTERVAL),
				MAX_ACTIVATION_DELAY
			);
		activationTimer = setTimeout(() => void checkActivation(), delay);
	} catch (e) {
		console.error('Guild flyer activation check failed:', e);
		activationTimer = setTimeout(() => void checkActivation(), MAX_ACTIVATION_DELAY);
	}
};

hook(() => {
	updateSets();
	void checkActivation();
});

// The database may still be migrating when this module is first evaluated.
setTimeout(() => void checkActivation(), 30 * 1000);

export const flyerRouter = router({
	files: fileProcedures(
		'guildFlyer',
		async (dataUrl, fileType) => {
			if (fileType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
				throw new TRPCError({
					message: 'Invalid File Type (XLSX Only)',
					code: 'BAD_REQUEST'
				});

			ensureSheetCols(xlsx.read(dataUrl.slice(dataUrl.indexOf(';base64,') + 8)), [
				'Flyer # ',
				'Date Flyer Starts ',
				'Date Flyer Ends',
				"Manufacture's Code",
				'Item Stock #',
				'Flyer Cost',
				'Flyer Price Level 0',
				'Flyer Price Level 1',
				'Flyer Price Retail Level',
				'Regular Price Level 0',
				'Regular Price Level 1'
			]);
		},
		runWorker,
		async () => {
			const kv = new KV<'lastDownloadedName' | 'downloadedNames'>('guildFlyer');

			const txt = await (await fetch(flyerSourceUrl + '?C=M;O=D')).text();

			const fileNames = getFlyerFileNames(txt, CLOUD_FLYER_FILE_COUNT);

			if (fileNames.length === 0)
				throw new TRPCError({
					message: 'Could not find flyer file name',
					code: 'NOT_FOUND'
				});

			// Flyers overlap, so every recent file is kept rather than only the newest.
			const downloaded = new Set(await getDownloadedNames(kv)),
				newFiles: CloudDownloadFile[] = [];

			for (const fileName of fileNames) {
				const downloadedName = encodeURIComponent(fileName);
				if (downloaded.has(downloadedName)) continue;

				const res = await fetch(flyerSourceUrl + fileName);

				const dataUrl = `data:${res.headers.get('Content-Type')};base64,${btoa(
					String.fromCharCode(...new Uint8Array(await res.arrayBuffer()))
				)}`;

				const workbook = xlsx.read(dataUrl.slice(dataUrl.indexOf(';base64,') + 8)),
					worksheet = workbook.Sheets[workbook.SheetNames[0]],
					flyerObjects = xlsx.utils.sheet_to_json(worksheet);

				const row = flyerObjects[0] as GuildFlyerRaw,
					startDate = new Date(row['Date Flyer Starts '] + ': GMT-0600'),
					endDate = new Date(row['Date Flyer Ends'] + ': GMT-0600');

				const name = `${startDate.toLocaleDateString('en-CA', {
					dateStyle: 'medium'
				})} to ${endDate.toLocaleDateString('en-CA', {
					dateStyle: 'medium'
				})} Flyer (${fileName.slice(0, fileName.indexOf('.'))}).${fileName.slice(
					fileName.indexOf('.') + 1
				)}`;

				newFiles.push({
					name,
					dataUrl,
					apply: false,
					onUploaded: async () => {
						downloaded.add(downloadedName);
						await kv.set('downloadedNames', JSON.stringify(Array.from(downloaded).slice(-50)));
					}
				});
			}

			return newFiles;
		},
		true
	),
	sets: router({
		get: viewerProcedure.query(getSets),
		getSub: createSetsSub(getSets),
		setOverride: generalProcedure
			.input(
				z.object({
					id: z.number().int(),
					override: z.enum(guildFlyerOverrideValues)
				})
			)
			.mutation(async ({ input: { id, override } }) => {
				const res = await db
					.update(guildFlyerSet)
					.set({ override, lastUpdated: Date.now() })
					.where(eq(guildFlyerSet.id, id))
					.returning({ id: guildFlyerSet.id });
				if (res.length === 0)
					throw new TRPCError({ code: 'NOT_FOUND', message: 'Flyer not found' });

				updateSets();
				await runFlyerResolve();
			}),
		del: generalProcedure
			.input(z.object({ id: z.number().int() }))
			.mutation(async ({ input: { id } }) => {
				await db
					.update(guildFlyerSet)
					.set({ deleted: true, lastUpdated: Date.now() })
					.where(eq(guildFlyerSet.id, id));

				updateSets();
				await runFlyerResolve();
			}),
		resolve: generalProcedure.input(z.object({})).mutation(async () => {
			await runFlyerResolve();
		})
	}),
	worker
});

const runFlyerResolve = async () => {
	lastResolveTriggered = Date.now();
	try {
		await runWorker({});
	} catch (e: any) {
		throw new TRPCError({ message: e.message ?? 'Could not update flyers', code: 'CONFLICT' });
	}
};

const getDownloadedNames = async (kv: KV<'lastDownloadedName' | 'downloadedNames'>) => {
	const stored = await kv.get('downloadedNames');
	if (stored) {
		try {
			return JSON.parse(stored) as string[];
		} catch {
			// fall through to the single-name key
		}
	}
	const last = await kv.get('lastDownloadedName');
	return last ? [last] : [];
};
