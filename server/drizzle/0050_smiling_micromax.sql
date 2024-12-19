ALTER TABLE "guild" RENAME TO "guildData";--> statement-breakpoint
ALTER TABLE "uniref" DROP CONSTRAINT "uniref_guild_guild_id_fk";
--> statement-breakpoint
ALTER TABLE "unifiedItems" DROP CONSTRAINT "unifiedItems_guild_guild_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guild_guildData_id_fk" FOREIGN KEY ("guild") REFERENCES "public"."guildData"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "unifiedItems" ADD CONSTRAINT "unifiedItems_guild_guildData_id_fk" FOREIGN KEY ("guild") REFERENCES "public"."guildData"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
