CREATE TYPE "public"."shopify_upload_status" AS ENUM('PENDING', 'UPLOADED', 'FAILED');--> statement-breakpoint
CREATE TABLE "shopifyMetadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"shopify_product_id" varchar(256),
	"lastUpdated" bigint NOT NULL,
	"status" "shopify_upload_status" NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "shopifyMetadata_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
ALTER TABLE "shopifyMetadata" ADD CONSTRAINT "shopifyMetadata_product_id_unifiedProduct_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."unifiedProduct"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shopify_metadata_product_id_idx" ON "shopifyMetadata" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "shopify_metadata_shopify_product_id_idx" ON "shopifyMetadata" USING btree ("shopify_product_id");