import type { Config } from "drizzle-kit";
import { POSTGRESQL } from "./src/env";

export default {
  schema: ["./src/db.schema.ts"],
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: POSTGRESQL,
  },
} satisfies Config;
