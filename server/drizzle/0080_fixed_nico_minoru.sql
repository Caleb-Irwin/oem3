ALTER TABLE "unifiedGuild" DROP CONSTRAINT "unifiedGuild_dataRow_guildData_id_fk";
--> statement-breakpoint
ALTER TABLE "unifiedGuild" ALTER COLUMN "gid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedGuild" ALTER COLUMN "dataRow" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_dataRow_guildData_id_fk" FOREIGN KEY ("dataRow") REFERENCES "public"."guildData"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_gid_unique" UNIQUE("gid");