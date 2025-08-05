import type { PgTransaction } from 'drizzle-orm/pg-core';
import { db } from '../db';

export async function retryableTransaction<T>(
	fn: (tx: PgTransaction<any, any, any>) => Promise<T>,
	maxAttempts = 10
): Promise<T> {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await db.transaction(fn, { isolationLevel: 'read committed' });
		} catch (err: any) {
			if (err?.code === '40001' && attempt < maxAttempts) {
				const backoff = Math.min(2 ** attempt * 50, 200);
				await sleep(backoff + Math.floor(Math.random() * 30));
				continue;
			}
			console.log(`Transaction failed on attempt ${attempt}:`, err);
			throw err;
		}
	}
	// We only reach here if every retry failed
	throw new Error(`Transaction failed after ${maxAttempts} attempts`);
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
