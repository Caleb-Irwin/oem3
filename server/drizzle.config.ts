import type { Config } from "drizzle-kit";

export default {
  schema: "./db/db.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.POSTGRESQL,
  },
} satisfies Config;
