DELETE FROM "qb_inventory_history" WHERE "source_file" IS NULL;--> statement-breakpoint
ALTER TABLE "qb_inventory_history" ALTER COLUMN "source_file" SET NOT NULL;--> statement-breakpoint
ALTER TYPE "public"."low_inventory_order_status" RENAME TO "order_planner_order_status";--> statement-breakpoint
ALTER TABLE "low_inventory_orders" RENAME TO "order_planner_orders";--> statement-breakpoint
ALTER TABLE "low_inventory_items" RENAME TO "order_planner_items";--> statement-breakpoint
ALTER TABLE "order_planner_orders" RENAME CONSTRAINT "low_inventory_orders_pkey" TO "order_planner_orders_pkey";--> statement-breakpoint
ALTER TABLE "order_planner_items" RENAME CONSTRAINT "low_inventory_items_pkey" TO "order_planner_items_pkey";--> statement-breakpoint
ALTER TABLE "order_planner_items" RENAME CONSTRAINT "low_inventory_items_qb_row_qb_id_fk" TO "order_planner_items_qb_row_qb_id_fk";--> statement-breakpoint
ALTER TABLE "order_planner_items" RENAME CONSTRAINT "low_inventory_items_order_id_low_inventory_orders_id_fk" TO "order_planner_items_order_id_order_planner_orders_id_fk";--> statement-breakpoint
ALTER INDEX "low_inventory_orders_status_idx" RENAME TO "order_planner_orders_status_idx";--> statement-breakpoint
ALTER INDEX "low_inventory_items_qb_row_idx" RENAME TO "order_planner_items_qb_row_idx";--> statement-breakpoint
ALTER INDEX "low_inventory_items_order_id_idx" RENAME TO "order_planner_items_order_id_idx";--> statement-breakpoint
ALTER INDEX "low_inventory_items_added_at_idx" RENAME TO "order_planner_items_added_at_idx";
