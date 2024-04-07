import { drizzle } from "drizzle-orm/node-postgres";
import { migrate as m } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import * as schema from "./db";

const connect = async (depth = 0): Promise<InstanceType<typeof Client>> => {
  try {
    const client = new Client({
      connectionString: process.env.POSTGRESQL,
    });
    await client.connect();
    return client;
  } catch (e) {
    if ((e.code === "ECONNREFUSED" || e.code === "57P03") && depth < 60) {
      await new Promise((res) => setTimeout(res, 500));
      return connect(depth + 1);
    } else console.log("Caught Error", e);
  }
};

//@ts-expect-error Bun allows this
const client = await connect();

export const db = drizzle(client, { schema });

export const migrate = async () =>
  await m(db, { migrationsFolder: "./drizzle" });
