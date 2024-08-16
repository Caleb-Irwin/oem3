ALTER TYPE "resource_type" ADD VALUE 'unifiedItem';--> statement-breakpoint
ALTER TABLE "unifiedItems" ALTER COLUMN "allowBackorder" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "unifiedItem" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_unifiedItem_unifiedItems_id_fk" FOREIGN KEY ("unifiedItem") REFERENCES "public"."unifiedItems"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uniref_unifiedItem_idx" ON "uniref" USING btree ("unifiedItem");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_unifiedItem_unique" UNIQUE("unifiedItem");