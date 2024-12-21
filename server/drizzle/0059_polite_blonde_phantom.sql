DROP INDEX IF EXISTS "upc_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "spr_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "cis_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "upc_idx" ON "unifiedGuild" USING btree ("upc");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spr_idx" ON "unifiedGuild" USING btree ("spr");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cis_idx" ON "unifiedGuild" USING btree ("cis");