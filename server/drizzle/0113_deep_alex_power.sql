CREATE TYPE "public"."shopify_image_status" AS ENUM('FAILED', 'PROCESSING', 'READY', 'UPLOADED');--> statement-breakpoint
CREATE TABLE "shopify_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_upload_url" text NOT NULL,
	"status" "shopify_image_status" NOT NULL,
	"shopify_media_id" varchar(256),
	"shopify_preview_url" text,
	"upload_date" timestamp DEFAULT now() NOT NULL,
	"product_id" integer,
	CONSTRAINT "shopify_media_shopify_media_id_unique" UNIQUE("shopify_media_id")
);
--> statement-breakpoint
ALTER TABLE "shopify" ADD COLUMN "onlineStoreUrl" text;--> statement-breakpoint
ALTER TABLE "shopify" ADD COLUMN "allMediaJSONArray" text;--> statement-breakpoint
ALTER TABLE "shopify" ADD COLUMN "vendor" varchar(255);--> statement-breakpoint
ALTER TABLE "shopify_media" ADD CONSTRAINT "shopify_media_product_id_unifiedProduct_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."unifiedProduct"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shopify_media_original_url_idx" ON "shopify_media" USING btree ("original_upload_url");--> statement-breakpoint
CREATE UNIQUE INDEX "shopify_media_id_idx" ON "shopify_media" USING btree ("shopify_media_id");