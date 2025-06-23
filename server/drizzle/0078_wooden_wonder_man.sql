ALTER TABLE "unifiedGuild" DROP CONSTRAINT "unifiedGuild_gid_unique";--> statement-breakpoint
ALTER TABLE "unifiedGuild" ALTER COLUMN "gid" DROP NOT NULL;