DELETE FROM "unifiedProductCellConfig" WHERE "col" = 'quickBooksPriceCents' AND "confType" IN ('setting:approve', 'setting:approveCustom', 'error:needsApproval', 'error:needsApprovalCustom');--> statement-breakpoint
ALTER TYPE "public"."unifiedProductColumn" RENAME VALUE 'quickBooksPriceCents' TO 'targetQuickBooksPriceCents';--> statement-breakpoint
ALTER TABLE "unifiedProduct" RENAME COLUMN "quickBooksPriceCents" TO "targetQuickBooksPriceCents";
