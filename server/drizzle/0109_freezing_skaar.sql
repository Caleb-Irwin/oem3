ALTER TABLE "unifiedProductCellConfig" ALTER COLUMN "col" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."unifiedProductColumn";--> statement-breakpoint
CREATE TYPE "public"."unifiedProductColumn" AS ENUM('gid', 'sprc', 'status', 'unifiedGuildRow', 'unifiedSprRow', 'qbRow', 'shopifyRow', 'upc', 'basics', 'cis', 'etilizeId', 'title', 'description', 'category', 'inFlyer', 'onlinePriceCents', 'onlineComparePriceCents', 'quickBooksPriceCents', 'guildCostCents', 'sprCostCents', 'um', 'qtyPerUm', 'primaryImage', 'primaryImageDescription', 'otherImagesJsonArr', 'availableForSaleOnline', 'guildInventory', 'localInventory', 'sprInventoryAvailability', 'weightGrams', 'vendor', 'deleted');--> statement-breakpoint
ALTER TABLE "unifiedProductCellConfig" ALTER COLUMN "col" SET DATA TYPE "public"."unifiedProductColumn" USING "col"::"public"."unifiedProductColumn";--> statement-breakpoint
DROP INDEX "product_spr_idx";--> statement-breakpoint
CREATE INDEX "product_gid_idx" ON "unifiedProduct" USING btree ("gid");--> statement-breakpoint
CREATE INDEX "product_sprc_idx" ON "unifiedProduct" USING btree ("sprc");--> statement-breakpoint
ALTER TABLE "unifiedProduct" DROP COLUMN "spr";