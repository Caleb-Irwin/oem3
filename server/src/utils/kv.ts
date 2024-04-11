import { eq } from "drizzle-orm";
import { db } from "../../db";
import { kv } from "../../db/db";

export class KV<T extends string> {
  private map = new Map<T, string>();
  private namespace: string;
  private inited = false;

  constructor(namespace: string) {
    this.namespace = namespace;
  }
  private async init() {
    const res = await db.query.kv.findMany({
      where: (kv, { eq }) => eq(kv.namespace, this.namespace),
    });
    res.forEach(({ key, value }) => this.map.set(key, value));
  }
  async get(key: T) {
    if (!this.inited) await this.init();
    return this.map.get(key);
  }
  async set(key: T, value: string) {
    if (value.includes(":")) throw new Error('Key can not include ":"');
    if (!this.inited) await this.init();
    await db
      .insert(kv)
      .values({
        id: `${this.namespace}:${key}`,
        namespace: this.namespace,
        key,
        value,
      })
      .onConflictDoUpdate({ target: kv.id, set: { value } });
    this.map.set(key, value);
  }
  async del(key: T) {
    if (!this.inited) await this.init();
    await db.delete(kv).where(eq(kv.id, `${this.namespace}:${key}`));
    this.map.delete(key);
  }
}

export const usersKv = new KV<"onlyValidAfterSeconds">("users");
