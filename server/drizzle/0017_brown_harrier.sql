ALTER TABLE "history" DROP CONSTRAINT "history_uniref_uniref_uniId_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "history" ADD CONSTRAINT "history_uniref_uniref_uniId_fk" FOREIGN KEY ("uniref") REFERENCES "uniref"("uniId") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
