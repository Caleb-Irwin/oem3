CREATE TYPE "public"."productCategory" AS ENUM('office', 'technologyInk', 'furniture', 'cleaningBreakRoom');--> statement-breakpoint
CREATE TYPE "public"."productStatus" AS ENUM('ACTIVE', 'DISCONTINUED', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."productUm" AS ENUM('ea', 'pk', 'bx');--> statement-breakpoint
CREATE TYPE "public"."unifiedProductColumn" AS ENUM('gid', 'sprc', 'status', 'unifiedGuildRow', 'unifiedSprRow', 'qbRow', 'shopifyRow', 'upc', 'spr', 'basics', 'cis', 'etilizeId', 'title', 'description', 'category', 'inFlyer', 'onlinePriceCents', 'onlineComparePriceCents', 'quickBooksPriceCents', 'guildCostCents', 'sprCostCents', 'um', 'qtyPerUm', 'primaryImage', 'primaryImageDescription', 'otherImagesJsonArr', 'availableForSaleOnline', 'guildInventory', 'localInventory', 'sprInventoryAvailability', 'weightGrams', 'vendor', 'deleted');--> statement-breakpoint
ALTER TYPE "public"."resource_type" ADD VALUE 'unifiedProduct';--> statement-breakpoint
CREATE TABLE "unifiedProduct" (
	"id" serial PRIMARY KEY NOT NULL,
	"gid" varchar(256),
	"sprc" varchar(256),
	"status" "productStatus",
	"unifiedGuildRow" integer,
	"unifiedSprRow" integer,
	"qbRow" integer,
	"shopifyRow" integer,
	"upc" varchar(128),
	"spr" varchar(128),
	"basics" varchar(128),
	"cis" varchar(128),
	"etilizeId" varchar(32),
	"title" text,
	"description" text,
	"category" "productCategory",
	"inFlyer" boolean,
	"onlinePriceCents" integer,
	"onlineComparePriceCents" integer,
	"quickBooksPriceCents" integer,
	"guildCostCents" integer,
	"sprCostCents" integer,
	"um" "productUm",
	"qtyPerUm" integer,
	"primaryImage" varchar(256),
	"primaryImageDescription" text,
	"otherImagesJsonArr" text,
	"availableForSale" boolean DEFAULT true NOT NULL,
	"guildInventory" integer,
	"localInventory" integer,
	"sprInventoryAvailability" "spr_price_status",
	"weightGrams" integer,
	"vendor" varchar(256),
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL,
	CONSTRAINT "unifiedProduct_gid_unique" UNIQUE("gid"),
	CONSTRAINT "unifiedProduct_sprc_unique" UNIQUE("sprc"),
	CONSTRAINT "unifiedProduct_unifiedGuildRow_unique" UNIQUE("unifiedGuildRow"),
	CONSTRAINT "unifiedProduct_unifiedSprRow_unique" UNIQUE("unifiedSprRow"),
	CONSTRAINT "unifiedProduct_qbRow_unique" UNIQUE("qbRow"),
	CONSTRAINT "unifiedProduct_shopifyRow_unique" UNIQUE("shopifyRow")
);
--> statement-breakpoint
CREATE TABLE "unifiedProductCellConfig" (
	"id" serial PRIMARY KEY NOT NULL,
	"rowId" integer NOT NULL,
	"col" "unifiedProductColumn" NOT NULL,
	"confType" "cellConfigType" NOT NULL,
	"value" text,
	"lastValue" text,
	"options" text,
	"message" text,
	"otherData" text,
	"resolved" boolean,
	"notes" text,
	"isDefaultSetting" boolean DEFAULT false NOT NULL,
	"created" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "unifiedProduct" integer;--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD CONSTRAINT "unifiedProduct_unifiedGuildRow_unifiedGuild_id_fk" FOREIGN KEY ("unifiedGuildRow") REFERENCES "public"."unifiedGuild"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD CONSTRAINT "unifiedProduct_unifiedSprRow_unifiedSpr_id_fk" FOREIGN KEY ("unifiedSprRow") REFERENCES "public"."unifiedSpr"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD CONSTRAINT "unifiedProduct_qbRow_qb_id_fk" FOREIGN KEY ("qbRow") REFERENCES "public"."qb"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD CONSTRAINT "unifiedProduct_shopifyRow_shopify_id_fk" FOREIGN KEY ("shopifyRow") REFERENCES "public"."shopify"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifiedProductCellConfig" ADD CONSTRAINT "unifiedProductCellConfig_rowId_unifiedProduct_id_fk" FOREIGN KEY ("rowId") REFERENCES "public"."unifiedProduct"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_unifiedGuildRow_idx" ON "unifiedProduct" USING btree ("unifiedGuildRow");--> statement-breakpoint
CREATE UNIQUE INDEX "product_unifiedSprRow_idx" ON "unifiedProduct" USING btree ("unifiedSprRow");--> statement-breakpoint
CREATE UNIQUE INDEX "product_qbRow_idx" ON "unifiedProduct" USING btree ("qbRow");--> statement-breakpoint
CREATE UNIQUE INDEX "product_shopifyRow_idx" ON "unifiedProduct" USING btree ("shopifyRow");--> statement-breakpoint
CREATE INDEX "product_upc_idx" ON "unifiedProduct" USING btree ("upc");--> statement-breakpoint
CREATE INDEX "product_spr_idx" ON "unifiedProduct" USING btree ("spr");--> statement-breakpoint
CREATE INDEX "product_basics_idx" ON "unifiedProduct" USING btree ("basics");--> statement-breakpoint
CREATE INDEX "product_cis_idx" ON "unifiedProduct" USING btree ("cis");--> statement-breakpoint
CREATE INDEX "product_etilizeId_idx" ON "unifiedProduct" USING btree ("etilizeId");--> statement-breakpoint
CREATE INDEX "product_lastUpdated_idx" ON "unifiedProduct" USING btree ("lastUpdated");--> statement-breakpoint
CREATE INDEX "product_deleted_idx" ON "unifiedProduct" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "product_availableForSaleOnline_idx" ON "unifiedProduct" USING btree ("availableForSale");--> statement-breakpoint
CREATE INDEX "product_inFlyer_idx" ON "unifiedProduct" USING btree ("inFlyer");--> statement-breakpoint
CREATE INDEX "product_status_idx" ON "unifiedProduct" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "unifiedProduct" USING btree ("category");--> statement-breakpoint
CREATE INDEX "unifiedProductCellConfig_refId_idx" ON "unifiedProductCellConfig" USING btree ("rowId");--> statement-breakpoint
CREATE INDEX "unifiedProductCellConfig_col_idx" ON "unifiedProductCellConfig" USING btree ("col");--> statement-breakpoint
CREATE INDEX "unifiedProductCellConfig_confType_idx" ON "unifiedProductCellConfig" USING btree ("confType");--> statement-breakpoint
CREATE INDEX "unifiedProductCellConfig_created_idx" ON "unifiedProductCellConfig" USING btree ("created");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_unifiedProduct_unifiedProduct_id_fk" FOREIGN KEY ("unifiedProduct") REFERENCES "public"."unifiedProduct"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniref_unifiedProduct_idx" ON "uniref" USING btree ("unifiedProduct");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_unifiedProduct_unique" UNIQUE("unifiedProduct");