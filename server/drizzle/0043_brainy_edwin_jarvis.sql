ALTER TYPE "changeset_type" ADD VALUE 'sprFlatFile';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sprFlatFile" (
	"id" serial PRIMARY KEY NOT NULL,
	"sprcSku" varchar(256) NOT NULL,
	"etilizeId" varchar(32),
	"sprCatalogSku" varchar(256),
	"brandName" varchar(256),
	"productType" varchar(256),
	"productLine" varchar(256),
	"productSeries" varchar(256),
	"fullDescription" text,
	"mainTitle" text,
	"subTitle" text,
	"marketingText" text,
	"subClassNumber" integer,
	"subClassName" varchar(256),
	"classNumber" integer,
	"className" varchar(256),
	"departmentNumber" integer,
	"departmentName" varchar(256),
	"masterDepartmentNumber" integer,
	"masterDepartmentName" varchar(256),
	"unspsc" integer,
	"keywords" text,
	"manufacturerId" integer,
	"manufacturerName" varchar(256),
	"productSpecs" text,
	"countyOfOrigin" varchar(256),
	"assemblyRequired" boolean,
	"image255" varchar(256),
	"image75" varchar(256),
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL,
	CONSTRAINT "sprFlatFile_sprcSku_unique" UNIQUE("sprcSku"),
	CONSTRAINT "sprFlatFile_etilizeId_unique" UNIQUE("etilizeId")
);
--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "sprFlatFile" integer;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sprFlatFile_sprcSku_idx" ON "sprFlatFile" USING btree ("sprcSku");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sprFlatFile_etilizeId_idx" ON "sprFlatFile" USING btree ("etilizeId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_sprFlatFile_sprFlatFile_id_fk" FOREIGN KEY ("sprFlatFile") REFERENCES "public"."sprFlatFile"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spr_flat_file_idx" ON "uniref" USING btree ("sprFlatFile");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_sprFlatFile_unique" UNIQUE("sprFlatFile");