ALTER TYPE "public"."unifiedSprColumn" ADD VALUE 'shortTitleFr' BEFORE 'category';--> statement-breakpoint
ALTER TYPE "public"."unifiedSprColumn" ADD VALUE 'titleFr' BEFORE 'category';--> statement-breakpoint
ALTER TYPE "public"."unifiedSprColumn" ADD VALUE 'descriptionFr' BEFORE 'category';--> statement-breakpoint
ALTER TYPE "public"."unifiedProductColumn" ADD VALUE 'novexco' BEFORE 'status';--> statement-breakpoint
CREATE TABLE "sprFlatFileFr" (
	"id" serial PRIMARY KEY NOT NULL,
	"etilizeId" varchar(32) NOT NULL,
	"sprcSku" varchar(256),
	"fullDescription" text,
	"mainTitle" text,
	"subTitle" text,
	"marketingText" text,
	"productSpecs" text,
	"keywords" text,
	"lastUpdated" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sprPriceFile" DROP CONSTRAINT "sprPriceFile_sprcSku_unique";--> statement-breakpoint
ALTER TABLE "unifiedSpr" DROP CONSTRAINT "unifiedSpr_sprc_unique";--> statement-breakpoint
DROP INDEX "spr_sprcSku_idx";--> statement-breakpoint
ALTER TABLE "sprPriceFile" ALTER COLUMN "sprcSku" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sprPriceFile" ALTER COLUMN "dealerNetPriceCents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sprPriceFile" ALTER COLUMN "netPriceCents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sprPriceFile" ALTER COLUMN "listPriceCents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedSpr" ALTER COLUMN "sprc" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "novexcoCode" varchar(64);--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "guildCode" varchar(256);--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "cws" varchar(64);--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "warehouseStatus" varchar(8);--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "directStatus" varchar(8);--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "descriptionFr" text;--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "categoryDescription" varchar(256);--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "supplierName" varchar(256);--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "supplierSku" varchar(256);--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "unitsPerPack" integer;--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "directCostCents" integer;--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD COLUMN "inventory" integer;--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD COLUMN "shortTitleFr" text;--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD COLUMN "titleFr" text;--> statement-breakpoint
ALTER TABLE "unifiedSpr" ADD COLUMN "descriptionFr" text;--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD COLUMN "novexco" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "sprFlatFileFr_etilizeId_idx" ON "sprFlatFileFr" USING btree ("etilizeId");--> statement-breakpoint
CREATE INDEX "sprFlatFileFr_last_updated_idx" ON "sprFlatFileFr" USING btree ("lastUpdated");--> statement-breakpoint
CREATE UNIQUE INDEX "spr_novexcoCode_idx" ON "sprPriceFile" USING btree ("novexcoCode");--> statement-breakpoint
-- novexco was previously copied from Etilize SKU mappings (not unique); the unifier now sets it from the price file
UPDATE "unifiedSpr" SET "novexco" = NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "unifiedSpr_novexco_idx" ON "unifiedSpr" USING btree ("novexco");--> statement-breakpoint
CREATE INDEX "product_novexco_idx" ON "unifiedProduct" USING btree ("novexco");--> statement-breakpoint
CREATE INDEX "spr_sprcSku_idx" ON "sprPriceFile" USING btree ("sprcSku");