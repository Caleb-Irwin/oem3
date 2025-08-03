ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_dataRow_unique" UNIQUE("dataRow");--> statement-breakpoint
ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_inventoryRow_unique" UNIQUE("inventoryRow");--> statement-breakpoint
ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_flyerRow_unique" UNIQUE("flyerRow");