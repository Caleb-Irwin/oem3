ALTER TABLE "unifiedSpr" RENAME COLUMN "sprcSku" TO "sprc";--> statement-breakpoint
ALTER TABLE "unifiedSpr" DROP CONSTRAINT "unifiedSpr_sprcSku_unique";--> statement-breakpoint
ALTER TABLE "unifiedSprCellConfig" ALTER COLUMN "col" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."unifiedSprColumn";--> statement-breakpoint
CREATE TYPE "public"."unifiedSprColumn" AS ENUM('sprc', 'sprPriceFileRow', 'sprFlatFileRow', 'etilizeId', 'cws', 'gtin', 'upc', 'shortTitle', 'title', 'description', 'category', 'dealerNetPriceCents', 'netPriceCents', 'listPriceCents', 'status', 'um', 'primaryImage', 'otherImagesJsonArr', 'allSizesJsonArr', 'keywords', 'brandName', 'manufacturerName', 'deleted');--> statement-breakpoint
ALTER TABLE "unifiedSprCellConfig" ALTER COLUMN "col" SET DATA TYPE "public"."unifiedSprColumn" USING "col"::"public"."unifiedSprColumn";--> statement-breakpoint
DROP INDEX "unifiedSpr_spr_sprcSku_idx";--> statement-breakpoint
CREATE INDEX "unifiedSpr_spr_sprc_idx" ON "unifiedSpr" USING btree ("sprc");--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD CONSTRAINT "unifiedSpr_sprc_unique" UNIQUE("sprc");