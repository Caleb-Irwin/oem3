CREATE TYPE "public"."summary_type" AS ENUM('all', 'unifiedGuild');--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "summary_type" NOT NULL,
	"data" text NOT NULL,
	CONSTRAINT "summaries_type_unique" UNIQUE("type")
);
