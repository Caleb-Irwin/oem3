CREATE TABLE IF NOT EXISTS "labelSheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(128),
	"public" boolean
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"sheet" integer,
	"barcode" varchar(256),
	"name" varchar(256),
	"price_cents" integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "labelSheet_id_idx" ON "labelSheets" ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "labels_id_idx" ON "labels" ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "labels_sheet_idx" ON "labels" ("sheet");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "labels" ADD CONSTRAINT "labels_sheet_labelSheets_id_fk" FOREIGN KEY ("sheet") REFERENCES "labelSheets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
