ALTER TABLE "uniref" RENAME COLUMN "guild_inventory" TO "guildInventory";--> statement-breakpoint
ALTER TABLE "uniref" DROP CONSTRAINT "uniref_guild_inventory_guild_inventory_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "uniref_guild_inventory_idx";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guildInventory_guild_inventory_id_fk" FOREIGN KEY ("guildInventory") REFERENCES "public"."guild_inventory"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uniref_guildInventory_idx" ON "uniref" USING btree ("guildInventory");