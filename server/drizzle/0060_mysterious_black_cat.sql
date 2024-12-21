ALTER TABLE "unifiedGuild" RENAME COLUMN "data" TO "dataRow";--> statement-breakpoint
ALTER TABLE "unifiedGuild" RENAME COLUMN "inventory" TO "inventoryRow";--> statement-breakpoint
ALTER TABLE "unifiedGuild" RENAME COLUMN "flyer" TO "flyerRow";--> statement-breakpoint
ALTER TABLE "unifiedGuild" DROP CONSTRAINT "unifiedGuild_data_guildData_id_fk";
--> statement-breakpoint
ALTER TABLE "unifiedGuild" DROP CONSTRAINT "unifiedGuild_inventory_guildInventory_id_fk";
--> statement-breakpoint
ALTER TABLE "unifiedGuild" DROP CONSTRAINT "unifiedGuild_flyer_guildFlyer_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "dataRow_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "inventoryRow_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "flyerRow_idx";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_dataRow_guildData_id_fk" FOREIGN KEY ("dataRow") REFERENCES "public"."guildData"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_inventoryRow_guildInventory_id_fk" FOREIGN KEY ("inventoryRow") REFERENCES "public"."guildInventory"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_flyerRow_guildFlyer_id_fk" FOREIGN KEY ("flyerRow") REFERENCES "public"."guildFlyer"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dataRow_idx" ON "unifiedGuild" USING btree ("dataRow");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inventoryRow_idx" ON "unifiedGuild" USING btree ("inventoryRow");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "flyerRow_idx" ON "unifiedGuild" USING btree ("flyerRow");