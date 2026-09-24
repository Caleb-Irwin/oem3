ALTER TYPE "public"."resource_type" ADD VALUE 'sprFlatFileFr' BEFORE 'unifiedGuild';--> statement-breakpoint
ALTER TYPE "public"."changeset_type" ADD VALUE 'sprFlatFileFr' BEFORE 'unifiedGuild';--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "sprFlatFileFr" integer;--> statement-breakpoint
-- Rows imported before French content became a changeset resource have no uniref; the next import recreates them
DELETE FROM "sprFlatFileFr";--> statement-breakpoint
ALTER TABLE "sprFlatFileFr" ADD COLUMN "deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_sprFlatFileFr_sprFlatFileFr_id_fk" FOREIGN KEY ("sprFlatFileFr") REFERENCES "public"."sprFlatFileFr"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_spr_flat_file_fr_idx" ON "uniref" USING btree ("sprFlatFileFr");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_sprFlatFileFr_unique" UNIQUE("sprFlatFileFr");