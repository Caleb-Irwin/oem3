import type { Config } from "drizzle-kit";

export default {
  schema: ["./db/db.ts", "./src/routers/*/table.ts"],
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.POSTGRESQL,
  },
} satisfies Config;
