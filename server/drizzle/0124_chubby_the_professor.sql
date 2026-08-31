DROP INDEX "low_inventory_items_qb_row_idx";--> statement-breakpoint
ALTER TABLE "qb_inventory_history" ADD COLUMN "source_file" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "qb_inventory_history_qb_row_source_file_idx" ON "qb_inventory_history" USING btree ("qb_row","source_file");--> statement-breakpoint
CREATE INDEX "low_inventory_items_qb_row_idx" ON "low_inventory_items" USING btree ("qb_row");