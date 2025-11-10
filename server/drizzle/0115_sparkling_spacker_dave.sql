ALTER TABLE "shopify_media" RENAME TO "shopifyMedia";--> statement-breakpoint
ALTER TABLE "shopifyMedia" DROP CONSTRAINT "shopify_media_shopify_media_id_unique";--> statement-breakpoint
ALTER TABLE "shopifyMedia" DROP CONSTRAINT "shopify_media_product_id_unifiedProduct_id_fk";
--> statement-breakpoint
ALTER TABLE "shopifyMedia" ADD CONSTRAINT "shopifyMedia_product_id_unifiedProduct_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."unifiedProduct"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopifyMedia" ADD CONSTRAINT "shopifyMedia_shopify_media_id_unique" UNIQUE("shopify_media_id");