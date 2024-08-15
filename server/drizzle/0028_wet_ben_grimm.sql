DO $$ BEGIN
 CREATE TYPE "public"."shopifyStatus" AS ENUM('ACTIVE', 'ARCHIVED', 'DRAFT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "resource_type" ADD VALUE 'shopify';--> statement-breakpoint
ALTER TYPE "changeset_type" ADD VALUE 'shopify';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shopify" (
	"id" serial PRIMARY KEY NOT NULL,
	"handle" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"htmlDescription" text,
	"imageId" varchar(128),
	"imageAltText" text,
	"totalInventory" integer,
	"tagsJsonArr" text,
	"hasOnlyDefaultVariant" boolean NOT NULL,
	"publishedAt" bigint,
	"updatedAt" bigint,
	"status" "shopifyStatus" NOT NULL,
	"variantId" varchar(128) NOT NULL,
	"vPriceCents" integer NOT NULL,
	"vComparePriceCents" integer,
	"vWeightGrams" integer,
	"vSku" varchar(128),
	"vBarcode" varchar(128),
	"vInventoryPolicyAllow" boolean,
	"vRequiresShipping" boolean,
	"vUnitCostCents" integer,
	"vInventoryAvailableStore" integer,
	"vInventoryOnHandStore" integer,
	"vInventoryCommittedStore" integer,
	"vInventoryOnHandWarehouse0" integer,
	"deleted" boolean DEFAULT false NOT NULL,
	"lastUpdated" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uniref" ADD COLUMN "shopify" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_shopify_shopify_id_fk" FOREIGN KEY ("shopify") REFERENCES "public"."shopify"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uniref_shopify_idx" ON "uniref" USING btree ("shopify");