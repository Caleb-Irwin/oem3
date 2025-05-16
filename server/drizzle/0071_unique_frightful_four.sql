DROP INDEX "unifiedGuildCellConfig_refId_idx";--> statement-breakpoint
CREATE INDEX "unifiedGuildCellConfig_refId_idx" ON "unifiedGuildCellConfig" USING btree ("rowId");