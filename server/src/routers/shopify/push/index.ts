import { z } from 'zod';
import { adminProcedure, router, viewerProcedure } from '../../../trpc';
import { isWorkerBusy, managedWorker } from '../../../utils/managedWorker';
import { activateAllInventoryLocations } from './activateInventoryLocations';
import { db } from '../../../db';
import { shopifyMetadata } from './shopifyMetadata.table';
import { and, count, desc, eq, gt, gte, sql } from 'drizzle-orm';
import { KV } from '../../../utils/kv';
import { isCloudDownloadActive } from '../../../utils/files';
import { eventSubscription } from '../../../utils/eventSubscription';
import { PushWorkerMessage, type PushHostMessage } from './types';
import { shopifyPushRuns } from './pushRuns.table';
import { shopify } from '../table';
import { unifiedProduct } from '../../product/table';
import { changesets } from '../../../utils/changeset.table';
import { MAX_UPLOAD_FAILURES } from './uploadFailures';

const { update: updateOverview, createSub: createOverviewSub } = eventSubscription();

/** Refreshes the sync overview, e.g. after a Shopify pull */
export const notifyShopifySyncChanged = () => updateOverview();

// Set by each push before it finishes, so the post-run hooks read the one that just ran
let syncNeeded = false;

const { worker, hook, runWorker } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'shopifyPush',
	[],
	({ msg }) => {
		if (msg === PushWorkerMessage.SyncNeeded) syncNeeded = true;
		else if (msg === PushWorkerMessage.SyncNotNeeded) syncNeeded = false;
		else if (msg === PushWorkerMessage.RunsChanged) updateOverview();
	},
	1
);

/** Runs cb after each push that changed listings the Shopify sync has to pull */
export const shopifyPushHook = (cb: () => void) =>
	hook(() => {
		if (syncNeeded) cb();
	});

/** Workers whose runs can lead to a product unifier run, so a push waits for all of them */
const UPSTREAM_WORKERS = [
	'guildData',
	'guildFlyer',
	'guildDesc',
	'unifiedGuild',
	'sprPriceFile',
	'sprFlatFile',
	'sprFlatFileFr',
	'sprImages',
	'unifiedSpr',
	'qb',
	'shopify',
	'unifiedProduct'
];
// Covers the gap between one worker finishing and the next starting, and groups bursts of edits
const QUIET_MS = 60 * 1000;

const pushKv = () => new KV<'pushRequestedAt' | 'lastRan' | 'autoPushEnabled'>('shopifyPush');

async function getPushState() {
	const kv = pushKv();
	const requestedAt = parseInt((await kv.get('pushRequestedAt')) ?? '0');
	return {
		// Off until turned on, since every unifier run then reaches the live store
		enabled: (await kv.get('autoPushEnabled')) === 'true',
		// lastRan is set by managedWorker to when the latest push started
		pending: requestedAt > parseInt((await kv.get('lastRan')) ?? '0'),
		requestedAt: requestedAt || null
	};
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;

function startPushTimer() {
	clearTimeout(pushTimer);
	const timer = setTimeout(async () => {
		try {
			const { enabled } = await getPushState();
			// Restarted by a newer request, or stopped, while reading the state
			if (pushTimer !== timer) return;
			if (!enabled) {
				pushTimer = undefined;
				return;
			}
			// A Shopify download in progress will run the Shopify worker and then the unifier
			if (UPSTREAM_WORKERS.some(isWorkerBusy) || isCloudDownloadActive('shopify')) {
				return startPushTimer();
			}
		} catch (e) {
			if (pushTimer === timer) pushTimer = undefined;
			console.error('Checking whether to push to Shopify failed:', e);
			return;
		}
		pushTimer = undefined;
		console.log('Products have settled; pushing to Shopify.');
		runWorker({ trigger: 'auto' } satisfies PushHostMessage)
			.catch((e) => console.error('Automatic Shopify push failed:', e))
			.finally(updateOverview);
	}, QUIET_MS);
	pushTimer = timer;
	updateOverview();
}

function stopPushTimer() {
	clearTimeout(pushTimer);
	pushTimer = undefined;
	updateOverview();
}

/**
 * Pushes to Shopify once the product unifier has settled: nothing upstream of it running or
 * queued, QUIET_MS after the last request. A push already running gets one more queued after it.
 * Requests made while automatic pushes are off are pushed once they are turned on.
 */
export async function requestShopifyPush() {
	try {
		await pushKv().set('pushRequestedAt', Date.now().toString());
		if ((await getPushState()).enabled) startPushTimer();
		else updateOverview();
	} catch (e) {
		console.error('Requesting a Shopify push failed:', e);
	}
}

getPushState()
	.then(({ enabled, pending }) => {
		if (enabled && pending) startPushTimer();
	})
	.catch((e) => console.error('Resuming a requested Shopify push failed:', e));

async function getOverview(historyLimit: number) {
	const [listings, linked, products, uploads, pushes, pulls] = await Promise.all([
		db
			.select({ status: shopify.status, count: count() })
			.from(shopify)
			.where(eq(shopify.deleted, false))
			.groupBy(shopify.status),
		db
			.select({ count: count() })
			.from(unifiedProduct)
			.innerJoin(shopify, eq(unifiedProduct.shopifyRow, shopify.id))
			.where(and(eq(unifiedProduct.deleted, false), eq(shopify.deleted, false))),
		db.select({ count: count() }).from(unifiedProduct).where(eq(unifiedProduct.deleted, false)),
		db
			.select({
				status: shopifyMetadata.status,
				count: count(),
				stuck:
					sql<number>`count(*) filter (where ${gte(shopifyMetadata.failureCount, MAX_UPLOAD_FAILURES)})`.mapWith(
						Number
					)
			})
			.from(shopifyMetadata)
			.groupBy(shopifyMetadata.status),
		db.query.shopifyPushRuns.findMany({
			orderBy: desc(shopifyPushRuns.startedAt),
			limit: historyLimit
		}),
		db.query.changesets.findMany({
			columns: { id: true, status: true, summary: true, created: true, file: true },
			where: eq(changesets.type, 'shopify'),
			orderBy: desc(changesets.created),
			limit: historyLimit
		})
	]);

	const uploadCount = (status: (typeof uploads)[number]['status']) =>
		uploads.find((u) => u.status === status);

	return {
		autoPush: {
			...(await getPushState()),
			// Waiting for the unifier to settle
			settling: pushTimer !== undefined
		},
		pullActive: isCloudDownloadActive('shopify'),
		listings: {
			byStatus: Object.fromEntries(listings.map((l) => [l.status, l.count])) as Partial<
				Record<(typeof listings)[number]['status'], number>
			>,
			linked: linked[0]?.count ?? 0,
			products: products[0]?.count ?? 0
		},
		uploads: {
			uploaded: uploadCount('UPLOADED')?.count ?? 0,
			pending: uploadCount('PENDING')?.count ?? 0,
			failed: uploadCount('FAILED')?.count ?? 0,
			// Only retried once the product changes again
			stuck: uploadCount('FAILED')?.stuck ?? 0
		},
		pushes: pushes.map((run) => ({
			...run,
			skipped: JSON.parse(run.skipped ?? '{}') as Record<string, number>,
			heldBack: JSON.parse(run.heldBack ?? '{}') as Record<string, number>
		})),
		pulls: pulls.map((pull) => ({
			...pull,
			summary: JSON.parse(pull.summary ?? '{}') as Partial<
				Record<'nop' | 'inventoryUpdate' | 'update' | 'create' | 'delete', number>
			>
		}))
	};
}

export type ShopifySyncOverview = Awaited<ReturnType<typeof getOverview>>;

const overviewInput = z.object({ historyLimit: z.number().int().min(1).max(200).default(10) });

export const shopifyPushRouter = router({
	worker,
	overview: viewerProcedure
		.input(overviewInput)
		.query(async ({ input }) => await getOverview(input.historyLimit)),
	overviewSub: createOverviewSub<z.input<typeof overviewInput>, ShopifySyncOverview>(
		async ({ input }) => await getOverview(overviewInput.parse(input ?? {}).historyLimit)
	),
	setAutoPush: adminProcedure
		.input(z.object({ enabled: z.boolean() }))
		.mutation(async ({ input: { enabled } }) => {
			await pushKv().set('autoPushEnabled', enabled.toString());
			if (!enabled) stopPushTimer();
			else if ((await getPushState()).pending) startPushTimer();
			else updateOverview();
		}),
	resetFailedUploads: adminProcedure.mutation(async () => {
		// Failing products are retried once they change; this retries all of them on the next push
		await db
			.update(shopifyMetadata)
			.set({ failureCount: 0 })
			.where(and(eq(shopifyMetadata.status, 'FAILED'), gt(shopifyMetadata.failureCount, 0)));
		updateOverview();
	}),
	activateAllInventoryLocations: adminProcedure.mutation(async () => {
		activateAllInventoryLocations();
	})
});
