ALTER TABLE "guild_inventory" RENAME TO "guildInventory";--> statement-breakpoint
ALTER TABLE "uniref" DROP CONSTRAINT "uniref_guildInventory_guild_inventory_id_fk";
--> statement-breakpoint
ALTER TABLE "guildInventory" ALTER COLUMN "qty_per_um" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "guildInventory" ALTER COLUMN "qty_per_um" DROP NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guildInventory_guildInventory_id_fk" FOREIGN KEY ("guildInventory") REFERENCES "public"."guildInventory"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
