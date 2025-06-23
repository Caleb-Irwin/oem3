import type { PgTransaction } from 'drizzle-orm/pg-core';
import { db } from '../db';

export async function runSerializable<T>(
	fn: (tx: PgTransaction<any, any, any>) => Promise<T>,
	maxAttempts = 10
): Promise<T> {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await db.transaction(fn, { isolationLevel: 'serializable' });
		} catch (err: any) {
			// Abort-and-retry only on serialization failure
			if (err?.code === '40001' && attempt < maxAttempts) {
				const backoff = Math.min(2 ** attempt * 50, 1000); // 50 ms, 100 ms, 200 ms …
				await sleep(backoff + Math.floor(Math.random() * 40)); // add jitter
				continue; // 🔁  restart from the top of for‑loop
			}
			throw err; // propagate other errors or give up
		}
	}
	// We only reach here if every retry failed
	throw new Error(`Transaction failed after ${maxAttempts} attempts`);
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
