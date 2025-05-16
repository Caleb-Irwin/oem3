ALTER TABLE "unifiedGuildCellConfig" RENAME COLUMN "cellType" TO "confType";--> statement-breakpoint
DROP INDEX "unifiedGuildCellConfig_confType_idx";--> statement-breakpoint
CREATE INDEX "unifiedGuildCellConfig_confType_idx" ON "unifiedGuildCellConfig" USING btree ("confType");