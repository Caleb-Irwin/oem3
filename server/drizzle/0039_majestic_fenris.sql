CREATE TABLE IF NOT EXISTS "guildDescriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"gid" varchar(256) NOT NULL,
	"sanitized_description" text,
	"image_list_json" text,
	"name" varchar(256),
	"price" varchar(256),
	"uom" varchar(256),
	"raw_result" text,
	"found" boolean DEFAULT false NOT NULL,
	"times_scrape_failed" integer DEFAULT 0 NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL
);
