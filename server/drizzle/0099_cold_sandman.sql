ALTER TABLE "sprFlatFile" ADD COLUMN "sprcSkuNoDash" varchar(256);--> statement-breakpoint
CREATE INDEX "sprFlatFile_sprcSkuNoDash_idx" ON "sprFlatFile" USING btree ("sprcSkuNoDash");