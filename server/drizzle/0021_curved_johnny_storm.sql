DO $$ BEGIN
 CREATE TYPE "public"."guild_um" AS ENUM('bx', 'bg', 'ct', 'cs', 'cd', 'ea', 'ev', 'kt', 'st', 'sl', 'tb', 'pr', 'pk');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "resource_type" ADD VALUE 'guild';--> statement-breakpoint
ALTER TYPE "changeset_type" ADD VALUE 'guild';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guild" (
	"id" serial PRIMARY KEY NOT NULL,
	"gid" varchar(256) NOT NULL,
	"upc" varchar(256),
	"spr" varchar(256),
	"basics" varchar(256),
	"cis" varchar(256),
	"price_l0_cents" integer NOT NULL,
	"price_l1_cents" integer NOT NULL,
	"price_retail_cents" integer NOT NULL,
	"member_price_cents" integer NOT NULL,
	"dropship_price_cents" integer NOT NULL,
	"short_desc" text DEFAULT '' NOT NULL,
	"long_desc" text DEFAULT '' NOT NULL,
	"image_url" varchar(256),
	"vendor" varchar(256),
	"web_category" integer DEFAULT -1 NOT NULL,
	"web_category_1_desc" text DEFAULT '' NOT NULL,
	"web_category_2_desc" text DEFAULT '' NOT NULL,
	"web_category_3_desc" text DEFAULT '' NOT NULL,
	"web_category_4_desc" text DEFAULT '' NOT NULL,
	"um" "guild_um",
	"standard_pack_qty" integer DEFAULT -1 NOT NULL,
	"master_pack_qty" integer DEFAULT -1 NOT NULL,
	"freight_flag" boolean DEFAULT false NOT NULL,
	"weight_grams" integer DEFAULT -1 NOT NULL,
	"heavy_goods_charge_sk_cents" integer DEFAULT 0 NOT NULL,
	"min_order_qty" integer DEFAULT -1 NOT NULL,
	"guild_date_changed" bigint,
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "guild" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guild_guild_id_fk" FOREIGN KEY ("guild") REFERENCES "public"."guild"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uniref_guild_idx" ON "uniref" USING btree ("guild");