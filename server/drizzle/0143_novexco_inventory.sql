ALTER TYPE "public"."unifiedSprColumn" ADD VALUE 'inventory' BEFORE 'um';--> statement-breakpoint
ALTER TYPE "public"."unifiedProductColumn" ADD VALUE 'novexcoInventory' BEFORE 'sprInventoryAvailability';--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD COLUMN "inventory" integer;--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD COLUMN "novexcoInventory" integer;