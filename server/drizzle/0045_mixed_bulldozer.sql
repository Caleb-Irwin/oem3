DO $$ BEGIN
 CREATE TYPE "public"."spr_image_status" AS ENUM('Published', 'Series Published', 'Third Party Published', 'Third Party Series Published');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."spr_sku_type" AS ENUM('CWS', 'UPC', 'GTIN', 'SPRC');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprEnhancedContent" (
	"id" serial PRIMARY KEY NOT NULL,
	"etilizeId" varchar(32),
	"sprc" varchar(64),
	"cws" varchar(64),
	"upc" varchar(64),
	"gtin" varchar(64),
	"primaryImage" varchar(64),
	"otherImagesJsonArr" text,
	"allSizesJsonArr" text,
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL,
	CONSTRAINT "sprEnhancedContent_etilizeId_unique" UNIQUE("etilizeId"),
	CONSTRAINT "sprEnhancedContent_sprc_unique" UNIQUE("sprc"),
	CONSTRAINT "sprEnhancedContent_cws_unique" UNIQUE("cws")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprImages" (
	"etilizeId" varchar(32) NOT NULL,
	"type" varchar(32) NOT NULL,
	"status" "spr_image_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprSkus" (
	"etilizeId" varchar(32) NOT NULL,
	"type" "spr_sku_type" NOT NULL,
	"sku" varchar(64) NOT NULL
);
