CREATE TYPE "public"."shopify_push_run_status" AS ENUM('running', 'completed', 'failed', 'interrupted');--> statement-breakpoint
CREATE TYPE "public"."shopify_push_trigger" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TABLE "shopifyPushRuns" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger" "shopify_push_trigger" NOT NULL,
	"status" "shopify_push_run_status" NOT NULL,
	"started_at" bigint NOT NULL,
	"finished_at" bigint,
	"created" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"archived" integer DEFAULT 0 NOT NULL,
	"recovered" integer DEFAULT 0 NOT NULL,
	"skipped" text,
	"held_back" text,
	"error" text
);
--> statement-breakpoint
CREATE INDEX "shopify_push_runs_started_at_idx" ON "shopifyPushRuns" USING btree ("started_at");