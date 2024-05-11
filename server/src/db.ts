import { drizzle } from "drizzle-orm/node-postgres";
import { migrate as m } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import * as schema from "./db.schema";
import { POSTGRESQL } from "./env";

const connect = async (depth = 0): Promise<InstanceType<typeof Client>> => {
  try {
    const client = new Client({
      connectionString: POSTGRESQL,
    });
    await client.connect();
    return client;
  } catch (e: any) {
    if ((e.code === "ECONNREFUSED" || e.code === "57P03") && depth < 60) {
      await new Promise((res) => setTimeout(res, 500));
      return await connect(depth + 1);
    } else throw e;
  }
};

const client = await connect();

export const db = drizzle(client, { schema });

export const migrate = async () =>
  await m(db, { migrationsFolder: "./drizzle" });
