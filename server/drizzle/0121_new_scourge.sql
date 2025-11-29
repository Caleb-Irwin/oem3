ALTER TABLE "sprEnhancedContent" DROP CONSTRAINT "sprEnhancedContent_etilizeId_unique";--> statement-breakpoint
DROP INDEX "sprEnhancedContent_etilizeId_idx";--> statement-breakpoint
CREATE INDEX "sprEnhancedContent_etilizeId_idx" ON "sprEnhancedContent" USING btree ("etilizeId");