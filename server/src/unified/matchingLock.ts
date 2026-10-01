import { sql } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { db } from '../db';

/**
 * A Postgres advisory lock per unified table. Matching holds it shared for every row update and
 * when a run starts, so holding it exclusively stops connections from changing, across processes.
 */
const lockKey = (unifiedTableName: string) => `matching/${unifiedTableName}`;

/** Waits while matching is paused. Held until the transaction ends, so call it in one. */
export async function holdMatchingLock(
	tx: PgTransaction<any, any, any> | typeof db,
	unifiedTableName: string
) {
	await tx.execute(sql`select pg_advisory_xact_lock_shared(hashtext(${lockKey(unifiedTableName)}))`);
}

/**
 * Runs fn with no matching for the table until it finishes. Returns null without running it if
 * matching is in progress. The lock is released if the process dies, since its connection closes.
 */
export async function whileMatchingPaused<T>(
	unifiedTableName: string,
	fn: () => Promise<T>
): Promise<{ result: T } | null> {
	const conn = await db.$client.reserve();
	try {
		const [{ locked }] =
			await conn`select pg_try_advisory_lock(hashtext(${lockKey(unifiedTableName)})) as locked`;
		if (!locked) return null;
		try {
			return { result: await fn() };
		} finally {
			await conn`select pg_advisory_unlock(hashtext(${lockKey(unifiedTableName)}))`;
		}
	} finally {
		conn.release();
	}
}
