ALTER TABLE "unifiedSprCellConfig" ALTER COLUMN "col" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."unifiedSprColumn";--> statement-breakpoint
CREATE TYPE "public"."unifiedSprColumn" AS ENUM('sprc', 'sprPriceFileRow', 'sprFlatFileRow', 'etilizeId', 'cws', 'gtin', 'upc', 'shortTitle', 'title', 'description', 'category', 'dealerNetPriceCents', 'netPriceCents', 'listPriceCents', 'status', 'um', 'primaryImage', 'primaryImageDescription', 'otherImagesJsonArr', 'keywords', 'brandName', 'manufacturerName', 'deleted');--> statement-breakpoint
ALTER TABLE "unifiedSprCellConfig" ALTER COLUMN "col" SET DATA TYPE "public"."unifiedSprColumn" USING "col"::"public"."unifiedSprColumn";--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD COLUMN "primaryImageDescription" text;--> statement-breakpoint
ALTER TABLE "unifiedSpr" DROP COLUMN "allSizesJsonArr";