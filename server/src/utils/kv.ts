import { eq } from 'drizzle-orm';
import { db as DB } from '../db';
import { kv } from './kv.table';

export class KV<T extends string> {
	private map = new Map<T, string | null>();
	private namespace: string;
	private inited = false;
	private db: typeof DB;

	constructor(namespace: string, db: typeof DB = DB) {
		this.namespace = namespace;
		this.db = db;
	}
	private async init() {
		const res = await this.db.query.kv.findMany({
			where: (kv, { eq }) => eq(kv.namespace, this.namespace)
		});
		res.forEach(({ key, value }) => this.map.set(key as T, value));
	}

	async refresh() {
		this.map.clear();
		this.inited = false;
		await this.init();
	}

	async get(key: T) {
		if (!this.inited) await this.init();
		return this.map.get(key);
	}
	async set(key: T, value: string) {
		if (key.includes(':')) throw new Error('Key can not include ":"');
		if (!this.inited) await this.init();
		await this.db
			.insert(kv)
			.values({
				id: `${this.namespace}:${key}`,
				namespace: this.namespace,
				key,
				value
			})
			.onConflictDoUpdate({ target: kv.id, set: { value } });
		this.map.set(key, value);
	}
	async del(key: T) {
		if (!this.inited) await this.init();
		await this.db.delete(kv).where(eq(kv.id, `${this.namespace}:${key}`));
		this.map.delete(key);
	}
}

export const usersKv = new KV<'onlyValidAfterSeconds'>('users');
