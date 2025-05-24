CREATE TYPE "public"."imageSourceType" AS ENUM('venxia', 'shopofficeonline');--> statement-breakpoint
CREATE TABLE "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"filePath" text NOT NULL,
	"isThumbnail" boolean DEFAULT false,
	"sourceURL" text,
	"sourceHash" text,
	"sourceType" "imageSourceType",
	"productId" varchar(256),
	"uploadedTime" bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX "images_sourceURL_idx" ON "images" USING btree ("sourceURL");--> statement-breakpoint
CREATE INDEX "images_productId_idx" ON "images" USING btree ("productId");