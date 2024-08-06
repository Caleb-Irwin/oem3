ALTER TYPE "resource_type" ADD VALUE 'guildFlyer';--> statement-breakpoint
ALTER TYPE "changeset_type" ADD VALUE 'guildFlyer';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guildFlyer" (
	"id" serial PRIMARY KEY NOT NULL,
	"gid" varchar(256) NOT NULL,
	"flyer_number" integer,
	"start_date" bigint,
	"end_date" bigint,
	"vendor_code" varchar(256),
	"flyer_cost_cents" integer,
	"flyer_price_l0_cents" integer,
	"flyer_price_l1_cents" integer,
	"flyer_price_retail_cents" integer,
	"regular_price_l0_cents" integer,
	"regular_price_l1_cents" integer,
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "guildFlyer" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guildFlyer_guildFlyer_id_fk" FOREIGN KEY ("guildFlyer") REFERENCES "public"."guildFlyer"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uniref_guildFlyer_idx" ON "uniref" USING btree ("guildFlyer");--> statement-breakpoint
ALTER TABLE "guildInventory" DROP COLUMN IF EXISTS "time_updated";