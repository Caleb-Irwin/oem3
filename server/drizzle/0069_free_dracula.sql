ALTER TYPE "public"."cellConfigType" ADD VALUE 'error:contradictorySources' BEFORE 'data:lastApprovedValue';--> statement-breakpoint
ALTER TYPE "public"."cellConfigType" ADD VALUE 'error:canNotBeSetToNull' BEFORE 'data:lastApprovedValue';--> statement-breakpoint
ALTER TYPE "public"."cellConfigType" ADD VALUE 'error:canNotBeSetToWrongType' BEFORE 'data:lastApprovedValue';--> statement-breakpoint
DROP INDEX "unifiedGuildCellConfig_cellType_idx";--> statement-breakpoint
CREATE INDEX "unifiedGuildCellConfig_confType_idx" ON "unifiedGuildCellConfig" USING btree ("cellType");