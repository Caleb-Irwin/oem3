DO $$ BEGIN
 CREATE TYPE "change_type" AS ENUM('nop', 'create', 'delete', 'update', 'inventoryUpdate');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "changeset_type" AS ENUM('qb');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"set" integer NOT NULL,
	"uniref" integer,
	"type" "change_type" NOT NULL,
	"data" text NOT NULL,
	"created" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "changesets" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "changeset_type" NOT NULL,
	"file" integer,
	"uploadedTime" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "changes_set_idx" ON "changes" ("set");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "changes_uniref_idx" ON "changes" ("uniref");--> statement-breakpoint
ALTER TABLE "qb" DROP COLUMN IF EXISTS "desc_lock";--> statement-breakpoint
ALTER TABLE "qb" DROP COLUMN IF EXISTS "cost_cents_lock";--> statement-breakpoint
ALTER TABLE "qb" DROP COLUMN IF EXISTS "price_cents_lock";--> statement-breakpoint
ALTER TABLE "qb" DROP COLUMN IF EXISTS "account_lock";--> statement-breakpoint
ALTER TABLE "qb" DROP COLUMN IF EXISTS "quantity_on_hand_lock";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "changes" ADD CONSTRAINT "changes_set_changesets_id_fk" FOREIGN KEY ("set") REFERENCES "changesets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "changes" ADD CONSTRAINT "changes_uniref_uniref_uniId_fk" FOREIGN KEY ("uniref") REFERENCES "uniref"("uniId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "changesets" ADD CONSTRAINT "changesets_file_files_id_fk" FOREIGN KEY ("file") REFERENCES "files"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
