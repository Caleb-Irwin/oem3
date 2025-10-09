ALTER TYPE "public"."unifiedGuildColumn" ADD VALUE 'inFlyer' BEFORE 'costCents';--> statement-breakpoint
ALTER TABLE "unifiedGuild" ADD COLUMN "inFlyer" boolean DEFAULT false;