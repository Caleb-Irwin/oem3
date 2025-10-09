DROP INDEX "qb_shortUpc_idx";--> statement-breakpoint
ALTER TABLE "qb" ADD COLUMN "product_name" varchar(256);--> statement-breakpoint
ALTER TABLE "qb" ADD COLUMN "upc" varchar(16);--> statement-breakpoint
ALTER TABLE "qb" ADD COLUMN "short_upc" varchar(16);--> statement-breakpoint
CREATE INDEX "qb_upc_idx" ON "qb" USING btree ("upc");--> statement-breakpoint
CREATE INDEX "qb_shortUpc_idx" ON "qb" USING btree ("short_upc");