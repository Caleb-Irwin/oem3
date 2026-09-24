CREATE TYPE "public"."productListingHold" AS ENUM('discontinued', 'duplicate', 'noEtilizeContent');--> statement-breakpoint
ALTER TYPE "public"."unifiedSprColumn" ADD VALUE 'duplicateOf' BEFORE 'shortTitle';--> statement-breakpoint
ALTER TYPE "public"."unifiedSprColumn" ADD VALUE 'duplicateCodes' BEFORE 'shortTitle';--> statement-breakpoint
ALTER TYPE "public"."unifiedProductColumn" ADD VALUE 'newListingHold' BEFORE 'guildInventory';--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "duplicateOf" varchar(64);--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "duplicateCodes" text;--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD COLUMN "duplicateOf" varchar(64);--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD COLUMN "duplicateCodes" text;--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD COLUMN "newListingHold" "productListingHold";