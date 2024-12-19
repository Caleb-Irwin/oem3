ALTER TABLE "unifiedGuild" DROP CONSTRAINT "unifiedGuild_data_guildData_id_fk";
--> statement-breakpoint
ALTER TABLE "sprFlatFile" ALTER COLUMN "etilizeId" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedGuild" ADD CONSTRAINT "unifiedGuild_data_guildData_id_fk" FOREIGN KEY ("data") REFERENCES "public"."guildData"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
