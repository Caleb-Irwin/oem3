ALTER TYPE "changeset_type" ADD VALUE 'unifiedGuild';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unifiedGuild" (
	"id" serial PRIMARY KEY NOT NULL,
	"gid" varchar(256) NOT NULL,
	"data" integer NOT NULL,
	"inventory" integer,
	"flyer" integer,
	"upc" varchar(256),
	"spr" varchar(256),
	"basics" varchar(256),
	"cis" varchar(256),
	"title" varchar(256),
	"description" text,
	"priceCents" integer,
	"comparePriceCents" integer,
	"costCents" integer,
	"um" "guild_um",
	"qtyPerUm" integer,
	"masterPackQty" integer,
	"imageUrl" varchar(256),
	"imageDescriptions" text,
	"imageListJSON" text,
	"vendor" varchar(256),
	"weightGrams" integer,
	"heavyGoodsChargeSkCents" integer,
	"freightFlag" boolean DEFAULT false,
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL,
	CONSTRAINT "unifiedGuild_gid_unique" UNIQUE("gid")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_data_guildData_id_fk" FOREIGN KEY ("data") REFERENCES "public"."guildData"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_inventory_guildInventory_id_fk" FOREIGN KEY ("inventory") REFERENCES "public"."guildInventory"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_flyer_guildFlyer_id_fk" FOREIGN KEY ("flyer") REFERENCES "public"."guildFlyer"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dataRow_idx" ON "unifiedGuild" USING btree ("data");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventoryRow_idx" ON "unifiedGuild" USING btree ("inventory");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "flyerRow_idx" ON "unifiedGuild" USING btree ("flyer");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "upc_idx" ON "unifiedGuild" USING btree ("upc");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spr_idx" ON "unifiedGuild" USING btree ("spr");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cis_idx" ON "unifiedGuild" USING btree ("cis");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lastUpdated_idx" ON "unifiedGuild" USING btree ("lastUpdated");