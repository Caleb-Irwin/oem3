ALTER TABLE "unifiedItems" RENAME COLUMN "flyerPriceColumnSettings" TO "flyerPriceCentsColumnSettings";--> statement-breakpoint
ALTER TABLE "unifiedItems" RENAME COLUMN "storePriceColumnSettings" TO "storePriceCentsColumnSettings";--> statement-breakpoint
ALTER TABLE "unifiedItems" RENAME COLUMN "onlinePriceColumnSettings" TO "onlinePriceCentsColumnSettings";--> statement-breakpoint
ALTER TABLE "unifiedItems" RENAME COLUMN "onlineInventory" TO "warehouse0Inventory";--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "qbAlt" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "shopifyAlt" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "defaultAltConversionFactor" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "defaultAltConversionFactorColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "packageUM" "guild_um";--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "defaultUmColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "altUmColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "priceCents" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "priceCentsColumnSettings" "column_settings";--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "altPriceCents" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "altPriceCentsColumnSettings" "column_settings";--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "altSalePriceCents" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "altFlyerPriceCentsColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "storeAltPriceCents" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "storeAltPriceCentsColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "onlineAltPriceCents" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "onlineAltPriceCentsColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "storeFlyerPriceCents" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "storeFlyerPriceCentsColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "storeFlyerAltPriceCents" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "storeFlyerAltPriceCentsColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "onlineFlyerPriceCents" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "onlineFlyerPriceCentsColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "onlineFlyerAltPriceCents" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "onlineFlyerAltPriceCentsColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "storeAltInventory" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "storeAltInventoryColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "warehouse0AltInventory" integer;--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD COLUMN "warehouse0AltInventoryColumnSettings" "column_settings" DEFAULT 'automatic' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_qbAlt_qb_id_fk" FOREIGN KEY ("qbAlt") REFERENCES "public"."qb"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_shopifyAlt_shopify_id_fk" FOREIGN KEY ("shopifyAlt") REFERENCES "public"."shopify"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unifiedItems_qbAlt_idx" ON "unifiedItems" USING btree ("qbAlt");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unifiedItems_shopifyAlt_idx" ON "unifiedItems" USING btree ("shopifyAlt");--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_qbAlt_unique" UNIQUE("qbAlt");--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_shopifyAlt_unique" UNIQUE("shopifyAlt");--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_shopify_shopifyAlt_unique" UNIQUE("shopify","shopifyAlt");--> statement-breakpoint
ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_qb_qbAlt_unique" UNIQUE("qb","qbAlt");