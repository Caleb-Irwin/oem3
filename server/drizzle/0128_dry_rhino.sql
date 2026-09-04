CREATE TYPE "public"."guild_flyer_override" AS ENUM('auto', 'active', 'inactive');--> statement-breakpoint
CREATE TABLE "guildFlyerItem" (
	"id" serial PRIMARY KEY NOT NULL,
	"set" integer NOT NULL,
	"gid" varchar(256) NOT NULL,
	"vendor_code" varchar(256),
	"flyer_cost_cents" integer,
	"flyer_price_l0_cents" integer,
	"flyer_price_l1_cents" integer,
	"flyer_price_retail_cents" integer,
	"regular_price_l0_cents" integer,
	"regular_price_l1_cents" integer
);
--> statement-breakpoint
CREATE TABLE "guildFlyerSet" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(256) NOT NULL,
	"flyer_number" integer,
	"start_date" bigint,
	"end_date" bigint,
	"source_file" integer,
	"override" "guild_flyer_override" DEFAULT 'auto' NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL,
	CONSTRAINT "guildFlyerSet_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "guildFlyer" ADD COLUMN "set" integer;--> statement-breakpoint
ALTER TABLE "guildFlyerItem" ADD CONSTRAINT "guildFlyerItem_set_guildFlyerSet_id_fk" FOREIGN KEY ("set") REFERENCES "public"."guildFlyerSet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guildFlyerSet" ADD CONSTRAINT "guildFlyerSet_source_file_files_id_fk" FOREIGN KEY ("source_file") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guild_flyer_item_set_gid_idx" ON "guildFlyerItem" USING btree ("set","gid");--> statement-breakpoint
CREATE INDEX "guild_flyer_item_gid_idx" ON "guildFlyerItem" USING btree ("gid");--> statement-breakpoint
CREATE INDEX "guild_flyer_set_key_idx" ON "guildFlyerSet" USING btree ("key");--> statement-breakpoint
CREATE INDEX "guild_flyer_set_dates_idx" ON "guildFlyerSet" USING btree ("start_date","end_date");--> statement-breakpoint
ALTER TABLE "guildFlyer" ADD CONSTRAINT "guildFlyer_set_guildFlyerSet_id_fk" FOREIGN KEY ("set") REFERENCES "public"."guildFlyerSet"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "guildFlyerSet" ("key", "flyer_number", "start_date", "end_date", "override", "active", "item_count", "deleted", "lastUpdated")
SELECT
	COALESCE("flyer_number"::text, 'd:' || COALESCE("start_date"::text, '') || '-' || COALESCE("end_date"::text, '')),
	"flyer_number",
	"start_date",
	"end_date",
	'auto',
	true,
	count(*),
	false,
	max("lastUpdated")
FROM "guildFlyer"
WHERE "deleted" = false
GROUP BY "flyer_number", "start_date", "end_date"
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "guildFlyerItem" ("set", "gid", "vendor_code", "flyer_cost_cents", "flyer_price_l0_cents", "flyer_price_l1_cents", "flyer_price_retail_cents", "regular_price_l0_cents", "regular_price_l1_cents")
SELECT
	"guildFlyerSet"."id",
	"guildFlyer"."gid",
	"guildFlyer"."vendor_code",
	"guildFlyer"."flyer_cost_cents",
	"guildFlyer"."flyer_price_l0_cents",
	"guildFlyer"."flyer_price_l1_cents",
	"guildFlyer"."flyer_price_retail_cents",
	"guildFlyer"."regular_price_l0_cents",
	"guildFlyer"."regular_price_l1_cents"
FROM "guildFlyer"
JOIN "guildFlyerSet" ON "guildFlyerSet"."key" = COALESCE("guildFlyer"."flyer_number"::text, 'd:' || COALESCE("guildFlyer"."start_date"::text, '') || '-' || COALESCE("guildFlyer"."end_date"::text, ''))
WHERE "guildFlyer"."deleted" = false
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "guildFlyer" SET "set" = "guildFlyerSet"."id"
FROM "guildFlyerSet"
WHERE "guildFlyer"."deleted" = false
	AND "guildFlyerSet"."key" = COALESCE("guildFlyer"."flyer_number"::text, 'd:' || COALESCE("guildFlyer"."start_date"::text, '') || '-' || COALESCE("guildFlyer"."end_date"::text, ''));
