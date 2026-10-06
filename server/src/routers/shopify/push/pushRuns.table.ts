import { bigint, index, integer, pgEnum, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const shopifyPushTriggerEnum = pgEnum('shopify_push_trigger', ['auto', 'manual']);

export const shopifyPushRunStatusEnum = pgEnum('shopify_push_run_status', [
	'running',
	'completed',
	'failed',
	// The process stopped without recording how the run ended
	'interrupted'
]);

/** One row per push, written by the push worker as it runs */
export const shopifyPushRuns = pgTable(
	'shopifyPushRuns',
	{
		id: serial('id').primaryKey(),
		trigger: shopifyPushTriggerEnum('trigger').notNull(),
		status: shopifyPushRunStatusEnum('status').notNull(),
		startedAt: bigint('started_at', { mode: 'number' }).notNull(),
		finishedAt: bigint('finished_at', { mode: 'number' }),
		created: integer('created').notNull().default(0),
		updated: integer('updated').notNull().default(0),
		failed: integer('failed').notNull().default(0),
		archived: integer('archived').notNull().default(0),
		// Listings created by an earlier push that stopped before saving its results
		recovered: integer('recovered').notNull().default(0),
		// JSON object counting the products not sent, by reason
		skipped: text('skipped'),
		// JSON object counting the new listings held back, by reason
		heldBack: text('held_back'),
		error: text('error')
	},
	(table) => [index('shopify_push_runs_started_at_idx').on(table.startedAt)]
);
