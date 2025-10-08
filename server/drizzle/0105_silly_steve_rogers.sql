ALTER TABLE "unifiedProduct" RENAME COLUMN "availableForSale" TO "availableForSaleOnline";--> statement-breakpoint
DROP INDEX "product_availableForSaleOnline_idx";--> statement-breakpoint
CREATE INDEX "product_availableForSaleOnline_idx" ON "unifiedProduct" USING btree ("availableForSaleOnline");