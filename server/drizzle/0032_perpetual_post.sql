DO $$ BEGIN
 CREATE TYPE "public"."column_settings" AS ENUM('automatic', 'automaticSmallChanges', 'approval', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."unified_item_type" AS ENUM('custom', 'guild');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unifiedItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "unified_item_type" NOT NULL,
	"guild" integer,
	"guildInventory" integer,
	"guildFlyer" integer,
	"qb" integer,
	"shopify" integer,
	"barcode" varchar(128),
	"barcodeColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"sku" varchar(128),
	"skuColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"storePriceCents" integer,
	"storePriceColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"onlinePriceCents" integer,
	"onlinePriceColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"salePriceCents" integer,
	"flyerPriceColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"title" text,
	"titleColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"description" text,
	"descriptionColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"imageUrl" text,
	"imageUrlColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"storeInventory" integer,
	"storeInventoryColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"onlineInventory" integer,
	"warehouse0InventoryColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"allowBackorder" boolean NOT NULL,
	"allowBackorderColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"costCents" integer,
	"costCentsColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL,
	CONSTRAINT "unifiedItems_guild_unique" UNIQUE("guild"),
	CONSTRAINT "unifiedItems_guildInventory_unique" UNIQUE("guildInventory"),
	CONSTRAINT "unifiedItems_guildFlyer_unique" UNIQUE("guildFlyer"),
	CONSTRAINT "unifiedItems_qb_unique" UNIQUE("qb"),
	CONSTRAINT "unifiedItems_shopify_unique" UNIQUE("shopify")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_guild_guild_id_fk" FOREIGN KEY ("guild") REFERENCES "public"."guild"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_guildInventory_guildInventory_id_fk" FOREIGN KEY ("guildInventory") REFERENCES "public"."guildInventory"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_guildFlyer_guildFlyer_id_fk" FOREIGN KEY ("guildFlyer") REFERENCES "public"."guildFlyer"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_qb_qb_id_fk" FOREIGN KEY ("qb") REFERENCES "public"."qb"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_shopify_shopify_id_fk" FOREIGN KEY ("shopify") REFERENCES "public"."shopify"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unifiedItems_guild_idx" ON "unifiedItems" USING btree ("guild");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unifiedItems_guildInventory_idx" ON "unifiedItems" USING btree ("guildInventory");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unifiedItems_guildFlyer_idx" ON "unifiedItems" USING btree ("guildFlyer");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unifiedItems_qb_idx" ON "unifiedItems" USING btree ("qb");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unifiedItems_shopify_idx" ON "unifiedItems" USING btree ("shopify");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unifiedItems_barcode_idx" ON "unifiedItems" USING btree ("barcode");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_changeset_unique" UNIQUE("changeset");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_qb_unique" UNIQUE("qb");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guild_unique" UNIQUE("guild");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guildInventory_unique" UNIQUE("guildInventory");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guildFlyer_unique" UNIQUE("guildFlyer");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_shopify_unique" UNIQUE("shopify");