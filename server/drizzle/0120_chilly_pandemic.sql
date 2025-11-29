ALTER TYPE "public"."unifiedSprColumn" ADD VALUE 'sprMarketingText' BEFORE 'dealerNetPriceCents';--> statement-breakpoint
ALTER TYPE "public"."unifiedSprColumn" ADD VALUE 'sprProductSpecs' BEFORE 'dealerNetPriceCents';--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD COLUMN "sprMarketingText" text;--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD COLUMN "sprProductSpecs" text;