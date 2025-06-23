import { drizzle, type PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { migrate as m } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './db.schema';
import { POSTGRESQL } from './env';

const connect = async (depth = 0): Promise<ReturnType<typeof postgres>> => {
	if (depth > 0) console.log('Connecting to DB (try ' + (depth + 1) + ')');
	try {
		const sql = postgres(POSTGRESQL, {
			onnotice: (e) => {
				if (e['code'] === '42P06' || e['code'] === '42P07') return;
				console.warn(e);
			}
		});

		const [{ setting: currentValue }] = await sql`
      SELECT setting FROM pg_settings WHERE name = 'max_pred_locks_per_transaction'
    `;
		const desiredValue = '1000';

		if (currentValue !== desiredValue) {
			console.log(
				`Current max_pred_locks_per_transaction is ${currentValue}, setting to ${desiredValue}`
			);
			await sql`ALTER SYSTEM SET max_pred_locks_per_transaction = 1000`;
			await sql`SELECT pg_reload_conf()`;
			console.log('Set max_pred_locks_per_transaction to', desiredValue);
		}

		return sql;
	} catch (e: any) {
		if ((e.code === 'ECONNREFUSED' || e.code === '57P03') && depth < 60) {
			await new Promise((res) => setTimeout(res, 500));
			return await connect(depth + 1);
		} else throw e;
	}
};

const client = await connect();

export const db = drizzle(client, { schema });

export const migrate = async () => await m(db, { migrationsFolder: './drizzle' });

import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';

export type Tx = PgTransaction<
	PostgresJsQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;
