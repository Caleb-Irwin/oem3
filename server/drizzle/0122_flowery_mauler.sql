CREATE TYPE "public"."low_inventory_order_status" AS ENUM('draft', 'sent', 'completed');--> statement-breakpoint
CREATE TABLE "low_inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"qb_row" integer NOT NULL,
	"order_id" integer,
	"added_at" bigint NOT NULL,
	"added_by" varchar(256) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "low_inventory_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"status" "low_inventory_order_status" DEFAULT 'draft' NOT NULL,
	"created_at" bigint NOT NULL,
	"created_by" varchar(256) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qb_inventory_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"qb_row" integer NOT NULL,
	"quantity_on_hand" integer,
	"quantity_on_sales_order" integer,
	"quantity_on_purchase_order" integer,
	"recorded_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "low_inventory_items" ADD CONSTRAINT "low_inventory_items_qb_row_qb_id_fk" FOREIGN KEY ("qb_row") REFERENCES "public"."qb"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "low_inventory_items" ADD CONSTRAINT "low_inventory_items_order_id_low_inventory_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."low_inventory_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qb_inventory_history" ADD CONSTRAINT "qb_inventory_history_qb_row_qb_id_fk" FOREIGN KEY ("qb_row") REFERENCES "public"."qb"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "low_inventory_items_qb_row_idx" ON "low_inventory_items" USING btree ("qb_row");--> statement-breakpoint
CREATE INDEX "low_inventory_items_order_id_idx" ON "low_inventory_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "low_inventory_items_added_at_idx" ON "low_inventory_items" USING btree ("added_at");--> statement-breakpoint
CREATE INDEX "low_inventory_orders_status_idx" ON "low_inventory_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "qb_inventory_history_qb_row_recorded_at_idx" ON "qb_inventory_history" USING btree ("qb_row","recorded_at");--> statement-breakpoint
CREATE INDEX "qb_inventory_history_recorded_at_idx" ON "qb_inventory_history" USING btree ("recorded_at");