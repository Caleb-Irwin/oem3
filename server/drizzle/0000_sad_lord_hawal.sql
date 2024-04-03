DO $$ BEGIN
 CREATE TYPE "permissionLevel" AS ENUM('admin', 'general', 'viewer', 'public');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"username" varchar(256) PRIMARY KEY NOT NULL,
	"password_hash" varchar(256),
	"permissionLevel" "permissionLevel",
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "username_idx" ON "users" ("username");