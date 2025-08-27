CREATE TYPE "public"."sprCategory" AS ENUM('office', 'technologyInk', 'furniture', 'cleaningBreakRoom');--> statement-breakpoint
CREATE TYPE "public"."unifiedSprColumn" AS ENUM('sprcSku', 'sprPriceFileRow', 'sprFlatFileRow', 'etilizeId', 'sprc', 'cws', 'gtin', 'upc', 'shortTitle', 'title', 'description', 'category', 'dealerNetPriceCents', 'netPriceCents', 'listPriceCents', 'status', 'um', 'primaryImage', 'otherImagesJsonArr', 'allSizesJsonArr', 'keywords', 'brandName', 'manufacturerName', 'deleted');--> statement-breakpoint
ALTER TYPE "public"."resource_type" ADD VALUE 'unifiedSpr';--> statement-breakpoint
CREATE TABLE "unifiedSpr" (
	"id" serial PRIMARY KEY NOT NULL,
	"sprcSku" varchar(256) NOT NULL,
	"sprPriceFileRow" integer NOT NULL,
	"sprFlatFileRow" integer,
	"etilizeId" varchar(32),
	"sprc" varchar(64),
	"cws" varchar(64),
	"gtin" varchar(64),
	"upc" varchar(32),
	"shortTitle" text,
	"title" text,
	"description" text,
	"category" "sprCategory",
	"dealerNetPriceCents" integer,
	"netPriceCents" integer,
	"listPriceCents" integer,
	"status" "spr_price_status",
	"um" "spr_price_um",
	"primaryImage" varchar(256),
	"otherImagesJsonArr" text,
	"allSizesJsonArr" text,
	"keywords" text,
	"brandName" varchar(256),
	"manufacturerName" varchar(256),
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL,
	CONSTRAINT "unifiedSpr_sprcSku_unique" UNIQUE("sprcSku"),
	CONSTRAINT "unifiedSpr_sprPriceFileRow_unique" UNIQUE("sprPriceFileRow"),
	CONSTRAINT "unifiedSpr_sprFlatFileRow_unique" UNIQUE("sprFlatFileRow")
);
--> statement-breakpoint
CREATE TABLE "unifiedSprCellConfig" (
	"id" serial PRIMARY KEY NOT NULL,
	"rowId" integer NOT NULL,
	"col" "unifiedSprColumn" NOT NULL,
	"confType" "cellConfigType" NOT NULL,
	"value" text,
	"lastValue" text,
	"options" text,
	"message" text,
	"otherData" text,
	"resolved" boolean,
	"notes" text,
	"created" bigint NOT NULL
);
--> statement-breakpoint
DROP INDEX "spr_price_file_idx";--> statement-breakpoint
DROP INDEX "spr_flat_file_idx";--> statement-breakpoint
DROP INDEX "resource_type_idx";--> statement-breakpoint
DROP INDEX "uniref_changesets_idx";--> statement-breakpoint
DROP INDEX "uniref_qb_idx";--> statement-breakpoint
DROP INDEX "uniref_guild_idx";--> statement-breakpoint
DROP INDEX "uniref_guildInventory_idx";--> statement-breakpoint
DROP INDEX "uniref_guildFlyer_idx";--> statement-breakpoint
DROP INDEX "uniref_shopify_idx";--> statement-breakpoint
DROP INDEX "uniref_unifiedGuild_idx";--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "unifiedSpr" integer;--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD CONSTRAINT "unifiedSpr_sprPriceFileRow_sprPriceFile_id_fk" FOREIGN KEY ("sprPriceFileRow") REFERENCES "public"."sprPriceFile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD CONSTRAINT "unifiedSpr_sprFlatFileRow_sprFlatFile_id_fk" FOREIGN KEY ("sprFlatFileRow") REFERENCES "public"."sprFlatFile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifiedSprCellConfig" ADD CONSTRAINT "unifiedSprCellConfig_rowId_unifiedSpr_id_fk" FOREIGN KEY ("rowId") REFERENCES "public"."unifiedSpr"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unifiedSpr_spr_price_row_idx" ON "unifiedSpr" USING btree ("sprPriceFileRow");--> statement-breakpoint
CREATE UNIQUE INDEX "unifiedSpr_spr_flat_row_idx" ON "unifiedSpr" USING btree ("sprFlatFileRow");--> statement-breakpoint
CREATE UNIQUE INDEX "unifiedSpr_spr_sprcSku_idx" ON "unifiedSpr" USING btree ("sprcSku");--> statement-breakpoint
CREATE INDEX "unifiedSpr_spr_etilizeId_idx" ON "unifiedSpr" USING btree ("etilizeId");--> statement-breakpoint
CREATE INDEX "unifiedSpr_spr_upc_idx" ON "unifiedSpr" USING btree ("upc");--> statement-breakpoint
CREATE INDEX "unifiedSpr_spr_lastUpdated_idx" ON "unifiedSpr" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX "unifiedSprCellConfig_refId_idx" ON "unifiedSprCellConfig" USING btree ("rowId");--> statement-breakpoint
CREATE INDEX "unifiedSprCellConfig_col_idx" ON "unifiedSprCellConfig" USING btree ("col");--> statement-breakpoint
CREATE INDEX "unifiedSprCellConfig_confType_idx" ON "unifiedSprCellConfig" USING btree ("confType");--> statement-breakpoint
CREATE INDEX "unifiedSprCellConfig_created_idx" ON "unifiedSprCellConfig" USING btree ("created");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_unifiedSpr_unifiedSpr_id_fk" FOREIGN KEY ("unifiedSpr") REFERENCES "public"."unifiedSpr"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_spr_price_file_idx" ON "uniref" USING btree ("sprPriceFile");--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_spr_flat_file_idx" ON "uniref" USING btree ("sprFlatFile");--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_unifiedSpr_idx" ON "uniref" USING btree ("unifiedSpr");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_type_idx" ON "uniref" USING btree ("uniId");--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_changesets_idx" ON "uniref" USING btree ("changeset");--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_qb_idx" ON "uniref" USING btree ("qb");--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_guild_idx" ON "uniref" USING btree ("guildData");--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_guildInventory_idx" ON "uniref" USING btree ("guildInventory");--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_guildFlyer_idx" ON "uniref" USING btree ("guildFlyer");--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_shopify_idx" ON "uniref" USING btree ("shopify");--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_unifiedGuild_idx" ON "uniref" USING btree ("unifiedGuild");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_unifiedGuild_unique" UNIQUE("unifiedGuild");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_unifiedSpr_unique" UNIQUE("unifiedSpr");