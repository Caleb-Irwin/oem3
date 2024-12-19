ALTER TYPE "resource_type" ADD VALUE 'unifiedGuild';--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "unifiedGuild" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_unifiedGuild_unifiedGuild_id_fk" FOREIGN KEY ("unifiedGuild") REFERENCES "public"."unifiedGuild"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uniref_unifiedGuild_idx" ON "uniref" USING btree ("unifiedGuild");