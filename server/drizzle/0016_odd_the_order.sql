DO $$ BEGIN
 CREATE TYPE "history_entry_type" AS ENUM('create', 'delete', 'update');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "history" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_type" "history_entry_type" NOT NULL,
	"set" integer,
	"uniref" integer NOT NULL,
	"data" text,
	"created" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "history_changes_set_idx" ON "history" ("set");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "history_uniref_idx" ON "history" ("uniref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "history_created_idx" ON "history" ("created");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "history_entry_type_idx" ON "history" ("entry_type");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "history" ADD CONSTRAINT "history_set_changesets_id_fk" FOREIGN KEY ("set") REFERENCES "changesets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "history" ADD CONSTRAINT "history_uniref_uniref_uniId_fk" FOREIGN KEY ("uniref") REFERENCES "uniref"("uniId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
