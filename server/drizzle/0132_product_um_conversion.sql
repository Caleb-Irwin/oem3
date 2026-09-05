ALTER TYPE "public"."unifiedProductColumn" ADD VALUE 'sourceToQuickBooksFactor' BEFORE 'targetQuickBooksPriceCents';--> statement-breakpoint
ALTER TYPE "public"."unifiedProductColumn" ADD VALUE 'quickBooksConversionAdjustmentPercent' BEFORE 'targetQuickBooksPriceCents';--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD COLUMN "sourceToQuickBooksFactor" double precision DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD COLUMN "quickBooksConversionAdjustmentPercent" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD CONSTRAINT "product_source_to_quickbooks_factor_positive" CHECK ("unifiedProduct"."sourceToQuickBooksFactor" > 0);--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD CONSTRAINT "product_quickbooks_conversion_adjustment_above_negative_100" CHECK ("unifiedProduct"."quickBooksConversionAdjustmentPercent" > -100);
