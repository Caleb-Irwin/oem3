ALTER TABLE "price_changes" ALTER COLUMN "change_percent_milli" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "price_change_export_items" ADD CONSTRAINT "price_change_export_items_previous_price_nonnegative" CHECK ("price_change_export_items"."previous_price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "price_change_export_items" ADD CONSTRAINT "price_change_export_items_new_price_nonnegative" CHECK ("price_change_export_items"."new_price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_current_price_nonnegative" CHECK ("price_changes"."current_price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_target_price_nonnegative" CHECK ("price_changes"."target_price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_approved_price_nonnegative" CHECK ("price_changes"."approved_price_cents" is null or "price_changes"."approved_price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_rejected_price_nonnegative" CHECK ("price_changes"."rejected_price_cents" is null or "price_changes"."rejected_price_cents" >= 0);
