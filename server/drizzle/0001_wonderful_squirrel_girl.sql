CREATE TABLE IF NOT EXISTS "kv" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"namespace" varchar(128),
	"key" varchar(128),
	"value" text,
	CONSTRAINT "kv_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kv_id_idx" ON "kv" ("key");