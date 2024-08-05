ALTER TYPE "resource_type" ADD VALUE 'guildInventory';--> statement-breakpoint
ALTER TYPE "changeset_type" ADD VALUE 'guildInventory';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guild_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"gid" varchar(256) NOT NULL,
	"on_hand" integer,
	"sku" varchar(256),
	"upc" varchar(256),
	"spr_id" varchar(256),
	"basics_id" varchar(256),
	"cis_id" varchar(256),
	"qty_per_um" integer DEFAULT 1 NOT NULL,
	"um" "guild_um",
	"time_updated" bigint,
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "guild_inventory" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guild_inventory_guild_inventory_id_fk" FOREIGN KEY ("guild_inventory") REFERENCES "public"."guild_inventory"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uniref_guild_inventory_idx" ON "uniref" USING btree ("guild_inventory");