CREATE TYPE "public"."price_change_category" AS ENUM('flyer', 'guild', 'spr', 'all');--> statement-breakpoint
CREATE TYPE "public"."price_change_channel" AS ENUM('quickBooks');--> statement-breakpoint
CREATE TYPE "public"."price_change_source" AS ENUM('guild', 'spr', 'other');--> statement-breakpoint
CREATE TYPE "public"."price_change_status" AS ENUM('pending', 'approved', 'rejected', 'exported');--> statement-breakpoint
CREATE TABLE "price_change_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"category" "price_change_category" NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"created_by" varchar(256) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_change_export_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"export_row" integer NOT NULL,
	"product_row" integer,
	"qb_id" varchar(256) NOT NULL,
	"qb_account" varchar(256),
	"product_name" varchar(256),
	"barcode" varchar(256),
	"title" text,
	"preferred_vendor" varchar(256),
	"previous_price_cents" integer NOT NULL,
	"new_price_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_row" integer NOT NULL,
	"channel" "price_change_channel" DEFAULT 'quickBooks' NOT NULL,
	"status" "price_change_status" DEFAULT 'pending' NOT NULL,
	"current_price_cents" integer NOT NULL,
	"target_price_cents" integer NOT NULL,
	"change_percent_milli" integer NOT NULL,
	"in_flyer" boolean DEFAULT false NOT NULL,
	"source" "price_change_source" DEFAULT 'other' NOT NULL,
	"approved_price_cents" integer,
	"rejected_price_cents" integer,
	"decided_at" bigint,
	"decided_by" varchar(256),
	"export_row" integer,
	"exported_at" bigint,
	"computed_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "labelSheets" ADD COLUMN "price_change_export" integer;--> statement-breakpoint
ALTER TABLE "price_change_export_items" ADD CONSTRAINT "price_change_export_items_export_row_price_change_exports_id_fk" FOREIGN KEY ("export_row") REFERENCES "public"."price_change_exports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_change_export_items" ADD CONSTRAINT "price_change_export_items_product_row_unifiedProduct_id_fk" FOREIGN KEY ("product_row") REFERENCES "public"."unifiedProduct"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_product_row_unifiedProduct_id_fk" FOREIGN KEY ("product_row") REFERENCES "public"."unifiedProduct"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_export_row_price_change_exports_id_fk" FOREIGN KEY ("export_row") REFERENCES "public"."price_change_exports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_change_exports_created_at_idx" ON "price_change_exports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "price_change_export_items_export_row_idx" ON "price_change_export_items" USING btree ("export_row");--> statement-breakpoint
CREATE INDEX "price_change_export_items_product_row_idx" ON "price_change_export_items" USING btree ("product_row");--> statement-breakpoint
CREATE UNIQUE INDEX "price_changes_product_channel_idx" ON "price_changes" USING btree ("product_row","channel");--> statement-breakpoint
CREATE INDEX "price_changes_status_idx" ON "price_changes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "price_changes_change_percent_idx" ON "price_changes" USING btree ("change_percent_milli");--> statement-breakpoint
CREATE INDEX "price_changes_export_row_idx" ON "price_changes" USING btree ("export_row");--> statement-breakpoint
ALTER TABLE "labelSheets" ADD CONSTRAINT "labelSheets_price_change_export_price_change_exports_id_fk" FOREIGN KEY ("price_change_export") REFERENCES "public"."price_change_exports"("id") ON DELETE set null ON UPDATE no action;