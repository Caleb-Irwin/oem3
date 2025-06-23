ALTER TABLE "unifiedGuild" DROP CONSTRAINT "unifiedGuild_dataRow_guildData_id_fk";
--> statement-breakpoint
ALTER TABLE "unifiedGuild" ALTER COLUMN "dataRow" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_dataRow_guildData_id_fk" FOREIGN KEY ("dataRow") REFERENCES "public"."guildData"("id") ON DELETE set null ON UPDATE no action;