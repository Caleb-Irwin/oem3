import { env } from "bun";

export const JWT_SECRET = env["JWT_SECRET"] as string,
  ADMIN_PASSWORD = env["ADMIN_PASSWORD"] as string,
  POSTGRESQL = env["POSTGRESQL"] as string;

if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable");
if (!ADMIN_PASSWORD)
  throw new Error("Missing ADMIN_PASSWORD environment variable");
if (!POSTGRESQL) throw new Error("Missing POSTGRESQL environment variable");
