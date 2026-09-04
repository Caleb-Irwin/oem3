CREATE TYPE "public"."smart_order_status" AS ENUM('insufficient', 'now', 'soon', 'later');--> statement-breakpoint
CREATE TABLE "smart_order_forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"qb_row" integer NOT NULL,
	"status" "smart_order_status" NOT NULL,
	"available_quantity" integer,
	"daily_depletion_milli" integer,
	"projected_stockout_at" bigint,
	"sample_count" integer NOT NULL,
	"span_days_milli" integer NOT NULL,
	"observed_depletion" integer NOT NULL,
	"observed_days_milli" integer NOT NULL,
	"restock_count" integer NOT NULL,
	"incoming_purchase_order" integer,
	"quantity_on_hand" integer,
	"quantity_on_sales_order" integer,
	"suggested_quantity" integer,
	"computed_at" bigint NOT NULL,
	"dismissed_at" bigint,
	"snoozed_until" bigint
);
--> statement-breakpoint
ALTER TABLE "smart_order_forecasts" ADD CONSTRAINT "smart_order_forecasts_qb_row_qb_id_fk" FOREIGN KEY ("qb_row") REFERENCES "public"."qb"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "smart_order_forecasts_qb_row_idx" ON "smart_order_forecasts" USING btree ("qb_row");--> statement-breakpoint
CREATE INDEX "smart_order_forecasts_status_idx" ON "smart_order_forecasts" USING btree ("status");
