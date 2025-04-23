DO $$ BEGIN
 CREATE TYPE "public"."cellConfigType" AS ENUM('setting:custom', 'setting:approve', 'setting:approveCustom', 'setting:tempOverride', 'error:multipleOptions', 'error:missingValue', 'error:needsApproval', 'data:lastApprovedValue', 'data:lastDisapprovedValue', 'data:userNote');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."unifiedGuildColumn" AS ENUM('gid', 'dataRow', 'inventoryRow', 'flyerRow', 'upc', 'spr', 'basics', 'cis', 'title', 'description', 'priceCents', 'comparePriceCents', 'costCents', 'um', 'qtyPerUm', 'masterPackQty', 'imageUrl', 'imageDescriptions', 'otherImageListJSON', 'vendor', 'category', 'weightGrams', 'heavyGoodsChargeSkCents', 'freightFlag', 'inventory');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unifiedGuildCellConfig" (
	"id" serial PRIMARY KEY NOT NULL,
	"rowId" integer NOT NULL,
	"col" "unifiedGuildColumn" NOT NULL,
	"cellType" "cellConfigType" NOT NULL,
	"data" text,
	"notes" text,
	"created" bigint NOT NULL,
	"lastUpdated" bigint NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedGuildCellConfig" ADD CONSTRAINT "unifiedGuildCellConfig_rowId_unifiedGuild_id_fk" FOREIGN KEY ("rowId") REFERENCES "public"."unifiedGuild"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unifiedGuildCellConfig_refId_idx" ON "unifiedGuildCellConfig" USING btree ("rowId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unifiedGuildCellConfig_col_idx" ON "unifiedGuildCellConfig" USING btree ("col");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unifiedGuildCellConfig_cellType_idx" ON "unifiedGuildCellConfig" USING btree ("cellType");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unifiedGuildCellConfig_lastUpdated_idx" ON "unifiedGuildCellConfig" USING btree ("lastUpdated");