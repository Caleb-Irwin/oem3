-- Guild inventory data source removed: drop its rows, history, changesets and settings first.
-- Enums are compared as text, as a fresh database adds these values in the same transaction.
DELETE FROM "search" WHERE "type"::text = 'guildInventory';--> statement-breakpoint
DELETE FROM "history" WHERE "resource_type"::text = 'guildInventory';--> statement-breakpoint
DELETE FROM "uniref" WHERE "resource_type"::text = 'guildInventory';--> statement-breakpoint
DELETE FROM "changesets" WHERE "type"::text = 'guildInventory';--> statement-breakpoint
DELETE FROM "unifiedGuildCellConfig" WHERE "col"::text IN ('inventoryRow', 'inventory');--> statement-breakpoint
DELETE FROM "unifiedProductCellConfig" WHERE "col"::text = 'guildInventory';--> statement-breakpoint
DELETE FROM "kv" WHERE "namespace" = 'guildInventory' OR "key" ILIKE '%guildInventory%' OR ("namespace" = 'unifiedGuild' AND "key" = 'lastGuildInventoryUpdate');--> statement-breakpoint
ALTER TABLE "uniref" DROP CONSTRAINT "uniref_guildInventory_guildInventory_id_fk";--> statement-breakpoint
ALTER TABLE "unifiedGuild" DROP CONSTRAINT "unifiedGuild_inventoryRow_guildInventory_id_fk";--> statement-breakpoint
ALTER TABLE "uniref" DROP CONSTRAINT "uniref_guildInventory_unique";--> statement-breakpoint
ALTER TABLE "unifiedGuild" DROP CONSTRAINT "unifiedGuild_inventoryRow_unique";--> statement-breakpoint
DROP TABLE "guildInventory";--> statement-breakpoint
ALTER TABLE "uniref" ALTER COLUMN "resource_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "history" ALTER COLUMN "resource_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "search" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."resource_type";--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('changeset', 'qb', 'guildData', 'guildFlyer', 'shopify', 'sprPriceFile', 'sprFlatFile', 'sprFlatFileFr', 'unifiedGuild', 'unifiedSpr', 'unifiedProduct');--> statement-breakpoint
ALTER TABLE "uniref" ALTER COLUMN "resource_type" SET DATA TYPE "public"."resource_type" USING "resource_type"::"public"."resource_type";--> statement-breakpoint
ALTER TABLE "history" ALTER COLUMN "resource_type" SET DATA TYPE "public"."resource_type" USING "resource_type"::"public"."resource_type";--> statement-breakpoint
ALTER TABLE "search" ALTER COLUMN "type" SET DATA TYPE "public"."resource_type" USING "type"::"public"."resource_type";--> statement-breakpoint
ALTER TABLE "changesets" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."changeset_type";--> statement-breakpoint
CREATE TYPE "public"."changeset_type" AS ENUM('qb', 'guildData', 'guildFlyer', 'shopify', 'sprPriceFile', 'sprFlatFile', 'sprFlatFileFr', 'unifiedGuild', 'unifiedSpr', 'unifiedProduct');--> statement-breakpoint
ALTER TABLE "changesets" ALTER COLUMN "type" SET DATA TYPE "public"."changeset_type" USING "type"::"public"."changeset_type";--> statement-breakpoint
ALTER TABLE "unifiedGuildCellConfig" ALTER COLUMN "col" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."unifiedGuildColumn";--> statement-breakpoint
CREATE TYPE "public"."unifiedGuildColumn" AS ENUM('gid', 'dataRow', 'flyerRow', 'upc', 'spr', 'basics', 'cis', 'title', 'description', 'priceCents', 'comparePriceCents', 'inFlyer', 'costCents', 'um', 'qtyPerUm', 'masterPackQty', 'imageUrl', 'imageDescription', 'otherImageListJSON', 'vendor', 'category', 'weightGrams', 'heavyGoodsChargeSkCents', 'freightFlag', 'deleted');--> statement-breakpoint
ALTER TABLE "unifiedGuildCellConfig" ALTER COLUMN "col" SET DATA TYPE "public"."unifiedGuildColumn" USING "col"::"public"."unifiedGuildColumn";--> statement-breakpoint
ALTER TABLE "unifiedProductCellConfig" ALTER COLUMN "col" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."unifiedProductColumn";--> statement-breakpoint
CREATE TYPE "public"."unifiedProductColumn" AS ENUM('gid', 'sprc', 'novexco', 'status', 'unifiedGuildRow', 'unifiedSprRow', 'qbRow', 'shopifyRow', 'upc', 'basics', 'cws', 'cis', 'etilizeId', 'title', 'description', 'category', 'inFlyer', 'onlinePriceCents', 'onlineComparePriceCents', 'sourceToQuickBooksFactor', 'quickBooksConversionAdjustmentPercent', 'targetQuickBooksPriceCents', 'guildCostCents', 'sprCostCents', 'um', 'qtyPerUm', 'primaryImage', 'primaryImageDescription', 'otherImagesJsonArr', 'availableForSaleOnline', 'newListingHold', 'localInventory', 'sprInventoryAvailability', 'weightGrams', 'vendor', 'deleted');--> statement-breakpoint
ALTER TABLE "unifiedProductCellConfig" ALTER COLUMN "col" SET DATA TYPE "public"."unifiedProductColumn" USING "col"::"public"."unifiedProductColumn";--> statement-breakpoint
DROP INDEX "uniref_guildInventory_idx";--> statement-breakpoint
DROP INDEX "inventoryRow_idx";--> statement-breakpoint
ALTER TABLE "uniref" DROP COLUMN "guildInventory";--> statement-breakpoint
ALTER TABLE "unifiedGuild" DROP COLUMN "inventoryRow";--> statement-breakpoint
ALTER TABLE "unifiedGuild" DROP COLUMN "inventory";--> statement-breakpoint
ALTER TABLE "unifiedProduct" DROP COLUMN "guildInventory";