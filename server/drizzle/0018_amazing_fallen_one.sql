ALTER TYPE "resource_type" ADD VALUE 'changeset';--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "changeset" integer;--> statement-breakpoint
ALTER TABLE "history" ADD COLUMN "resource_type" "resource_type" NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uniref_changesets_idx" ON "uniref" ("changeset");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "history_resource_type_idx" ON "history" ("resource_type");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_changeset_changesets_id_fk" FOREIGN KEY ("changeset") REFERENCES "changesets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
