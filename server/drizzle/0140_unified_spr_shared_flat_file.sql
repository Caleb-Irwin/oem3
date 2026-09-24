ALTER TABLE "unifiedSpr" DROP CONSTRAINT "unifiedSpr_sprFlatFileRow_unique";--> statement-breakpoint
DROP INDEX "unifiedSpr_spr_flat_row_idx";--> statement-breakpoint
CREATE INDEX "unifiedSpr_spr_flat_row_idx" ON "unifiedSpr" USING btree ("sprFlatFileRow");