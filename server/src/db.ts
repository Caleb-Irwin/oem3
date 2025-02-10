import { drizzle } from "drizzle-orm/postgres-js";
import { migrate as m } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./db.schema";
import { POSTGRESQL } from "./env";

const connect = async (depth = 0): Promise<ReturnType<typeof postgres>> => {
  if (depth > 0) console.log("Connecting to DB (try " + (depth + 1) + ")");
  try {
    const sql = postgres(POSTGRESQL, {
      onnotice: (e) => {
        if (e["code"] === "42P06" || e["code"] === "42P07") return;
        console.warn(e);
      },
    });
    await sql`select 1`;
    return sql;
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
