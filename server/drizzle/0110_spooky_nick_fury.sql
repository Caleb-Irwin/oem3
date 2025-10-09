ALTER TYPE "public"."unifiedProductColumn" ADD VALUE 'cws' BEFORE 'cis';--> statement-breakpoint
ALTER TABLE "unifiedProduct" ADD COLUMN "cws" varchar(128);--> statement-breakpoint
CREATE INDEX "product_cws_idx" ON "unifiedProduct" USING btree ("cws");