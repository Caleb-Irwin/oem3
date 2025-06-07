ALTER TABLE "unifiedGuildCellConfig" RENAME COLUMN "data" TO "otherData";--> statement-breakpoint
ALTER TABLE "unifiedGuildCellConfig" ADD COLUMN "value" text;--> statement-breakpoint
ALTER TABLE "unifiedGuildCellConfig" ADD COLUMN "lastValue" text;--> statement-breakpoint
ALTER TABLE "unifiedGuildCellConfig" ADD COLUMN "options" text;--> statement-breakpoint
ALTER TABLE "unifiedGuildCellConfig" ADD COLUMN "message" text;