ALTER TABLE "unifiedItems" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "uniref" DROP CONSTRAINT "uniref_unifiedItem_unique";--> statement-breakpoint
ALTER TABLE "uniref" DROP CONSTRAINT "uniref_unifiedItem_unifiedItems_id_fk";--> statement-breakpoint
DROP TABLE "unifiedItems" CASCADE;--> statement-breakpoint
ALTER TABLE "uniref" ALTER COLUMN "resource_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "history" ALTER COLUMN "resource_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "search" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."resource_type";--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('changeset', 'qb', 'guildData', 'guildInventory', 'guildFlyer', 'shopify', 'sprPriceFile', 'sprFlatFile', 'unifiedGuild');--> statement-breakpoint
DELETE FROM "uniref" WHERE "resource_type" NOT IN ('changeset', 'qb', 'guildData', 'guildInventory', 'guildFlyer', 'shopify', 'sprPriceFile', 'sprFlatFile', 'unifiedGuild');--> statement-breakpoint
ALTER TABLE "uniref" ALTER COLUMN "resource_type" SET DATA TYPE "public"."resource_type" USING "resource_type"::"public"."resource_type";--> statement-breakpoint
DELETE FROM "history" WHERE "resource_type" NOT IN ('changeset', 'qb', 'guildData', 'guildInventory', 'guildFlyer', 'shopify', 'sprPriceFile', 'sprFlatFile', 'unifiedGuild');--> statement-breakpoint
ALTER TABLE "history" ALTER COLUMN "resource_type" SET DATA TYPE "public"."resource_type" USING "resource_type"::"public"."resource_type";--> statement-breakpoint
DELETE FROM "search" WHERE "type" NOT IN ('changeset', 'qb', 'guildData', 'guildInventory', 'guildFlyer', 'shopify', 'sprPriceFile', 'sprFlatFile', 'unifiedGuild');--> statement-breakpoint
ALTER TABLE "search" ALTER COLUMN "type" SET DATA TYPE "public"."resource_type" USING "type"::"public"."resource_type";--> statement-breakpoint
DROP INDEX "uniref_unifiedItem_idx";--> statement-breakpoint
ALTER TABLE "uniref" DROP COLUMN "unifiedItem";--> statement-breakpoint
DROP TYPE "public"."column_settings";--> statement-breakpoint
DROP TYPE "public"."unified_item_type";