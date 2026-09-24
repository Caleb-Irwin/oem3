ALTER TYPE "public"."spr_sku_type" ADD VALUE 'NOVEXCO';--> statement-breakpoint
ALTER TYPE "public"."unifiedSprColumn" ADD VALUE 'novexco' BEFORE 'gtin';--> statement-breakpoint
ALTER TABLE "sprEnhancedContent" ADD COLUMN "novexco" varchar(64);--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD COLUMN "novexco" varchar(64);