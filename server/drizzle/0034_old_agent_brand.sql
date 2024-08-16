CREATE INDEX IF NOT EXISTS "qb_shortUpc_idx" ON "qb" USING btree (SUBSTR(
        SUBSTR("qb_id", POSITION(':' IN "qb_id") + 1),
        LENGTH(SUBSTR("qb_id", POSITION(':' IN "qb_id") + 1)) - 10,
        10
      ));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_upc_idx" ON "guild" USING btree ("upc");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_shortUpc_idx" ON "guild" USING btree (SUBSTR("upc", LENGTH("upc") - 10, 10));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shopify_productId_idx" ON "shopify" USING btree ("productId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shopify_variantId_idx" ON "shopify" USING btree ("variantId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shopify_variantBarcode_idx" ON "shopify" USING btree ("vBarcode");--> statement-breakpoint
ALTER TABLE "shopify" ADD CONSTRAINT "shopify_variantId_unique" UNIQUE("variantId");