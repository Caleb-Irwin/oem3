CREATE INDEX IF NOT EXISTS "qb_last_updated_idx" ON "qb" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_data_last_updated_idx" ON "guildData" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_inventory_gid_idx" ON "guildInventory" USING btree ("gid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_inventory_last_updated_idx" ON "guildInventory" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_flyer_gid_idx" ON "guildFlyer" USING btree ("gid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_flyer_last_updated_idx" ON "guildFlyer" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shopify_last_updated_idx" ON "shopify" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unifiedItems_last_updated_idx" ON "unifiedItems" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_descriptions_gid_idx" ON "guildDescriptions" USING btree ("gid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_descriptions_last_updated_idx" ON "guildDescriptions" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spr_last_updated_idx" ON "sprPriceFile" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sprFlatFile_last_updated_idx" ON "sprFlatFile" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sprEnhancedContent_last_updated_idx" ON "sprEnhancedContent" USING btree ("lastUpdated");