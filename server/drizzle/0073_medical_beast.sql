DROP INDEX "unifiedGuildCellConfig_lastUpdated_idx";--> statement-breakpoint
CREATE INDEX "unifiedGuildCellConfig_created_idx" ON "unifiedGuildCellConfig" USING btree ("created");--> statement-breakpoint
ALTER TABLE "unifiedGuildCellConfig" DROP COLUMN "lastUpdated";