DO $$ BEGIN
 CREATE TYPE "public"."spr_price_status" AS ENUM('Active', 'Discontinued', 'Not available');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."spr_price_um" AS ENUM('EA', 'PAC', 'BOX');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "resource_type" ADD VALUE 'sprPriceFile';--> statement-breakpoint
ALTER TYPE "changeset_type" ADD VALUE 'sprPriceFile';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprPriceFile" (
	"id" serial PRIMARY KEY NOT NULL,
	"sprcSku" varchar(256) NOT NULL,
	"etilizeId" varchar(32),
	"status" "spr_price_status",
	"description" text,
	"um" "spr_price_um",
	"upc" varchar(32),
	"catPage" integer,
	"dealerNetPriceCents" integer NOT NULL,
	"netPriceCents" integer NOT NULL,
	"listPriceCents" integer NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL,
	CONSTRAINT "sprPriceFile_sprcSku_unique" UNIQUE("sprcSku"),
	CONSTRAINT "sprPriceFile_etilizeId_unique" UNIQUE("etilizeId")
);
--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "sprPriceFile" integer;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spr_sprcSku_idx" ON "sprPriceFile" USING btree ("sprcSku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spr_etilizeId_idx" ON "sprPriceFile" USING btree ("etilizeId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_sprPriceFile_sprPriceFile_id_fk" FOREIGN KEY ("sprPriceFile") REFERENCES "public"."sprPriceFile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spr_price_file_idx" ON "uniref" USING btree ("sprPriceFile");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_sprPriceFile_unique" UNIQUE("sprPriceFile");