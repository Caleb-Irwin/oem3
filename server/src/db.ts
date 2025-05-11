import { drizzle } from "drizzle-orm/bun-sql";
import { migrate as m } from "drizzle-orm/bun-sql/migrator";
import * as schema from "./db.schema";
import { POSTGRESQL } from "./env";
import { SQL } from "bun";

const getClient = async (depth = 0) => {
  if (depth > 0) console.log("Connecting to DB (try " + (depth + 1) + ")");
  try {
    const sql = new SQL(POSTGRESQL);
    await sql`select 1`;
    return sql;
  } catch (e: any) {
    if ((e.code === "ECONNREFUSED" || e.code === "57P03") && depth < 60) {
      await new Promise((res) => setTimeout(res, 500));
      return await getClient(depth + 1);
    } else throw e;
  }
};

export const db = drizzle({ client: await getClient(), schema });

export const migrate = async () =>
  await m(db, { migrationsFolder: "./drizzle" });
