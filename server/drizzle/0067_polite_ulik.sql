ALTER TABLE "unifiedGuild" RENAME COLUMN "imageListJSON" TO "otherImageListJSON";--> statement-breakpoint
ALTER TABLE "unifiedGuildCellConfig" ALTER COLUMN "cellType" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."cellConfigType";--> statement-breakpoint
CREATE TYPE "public"."cellConfigType" AS ENUM('setting:custom', 'setting:approve', 'setting:approveCustom', 'error:multipleOptions', 'error:missingValue', 'error:needsApproval', 'error:matchWouldCauseDuplicate', 'data:lastApprovedValue', 'data:lastDisapprovedValue', 'data:userNote');--> statement-breakpoint
ALTER TABLE "unifiedGuildCellConfig" ALTER COLUMN "cellType" SET DATA TYPE "public"."cellConfigType" USING "cellType"::"public"."cellConfigType";