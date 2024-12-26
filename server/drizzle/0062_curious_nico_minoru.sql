ALTER TABLE "sprFlatFile" DROP CONSTRAINT "sprFlatFile_sprcSku_unique";--> statement-breakpoint
ALTER TABLE "sprFlatFile" DROP CONSTRAINT "sprFlatFile_etilizeId_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "sprFlatFile_sprcSku_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sprFlatFile_sprcSku_idx" ON "sprFlatFile" USING btree ("sprcSku");