ALTER TABLE "unifiedItems" ADD COLUMN "sprPriceFile" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "sprFlatFile" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_sprPriceFile_sprPriceFile_id_fk" FOREIGN KEY ("sprPriceFile") REFERENCES "public"."sprPriceFile"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_sprFlatFile_sprFlatFile_id_fk" FOREIGN KEY ("sprFlatFile") REFERENCES "public"."sprFlatFile"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_sprPriceFile_unique" UNIQUE("sprPriceFile");--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_sprFlatFile_unique" UNIQUE("sprFlatFile");