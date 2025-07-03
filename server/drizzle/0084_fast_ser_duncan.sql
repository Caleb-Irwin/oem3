CREATE TYPE "public"."history_conf_type" AS ENUM('setting', 'error');--> statement-breakpoint
ALTER TABLE "history" ALTER COLUMN "entry_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."history_entry_type";--> statement-breakpoint
CREATE TYPE "public"."history_entry_type" AS ENUM('create', 'delete', 'update');--> statement-breakpoint
ALTER TABLE "history" ALTER COLUMN "entry_type" SET DATA TYPE "public"."history_entry_type" USING "entry_type"::"public"."history_entry_type";--> statement-breakpoint
ALTER TABLE "history" ADD COLUMN "conf_cell" text;--> statement-breakpoint
ALTER TABLE "history" ADD COLUMN "conf_type" "history_conf_type";