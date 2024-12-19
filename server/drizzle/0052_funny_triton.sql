ALTER TYPE "resource_type" ADD VALUE 'guildData';--> statement-breakpoint
ALTER TABLE "uniref" RENAME COLUMN "guild" TO "guildData";--> statement-breakpoint
ALTER TABLE "uniref" DROP CONSTRAINT "uniref_guild_unique";--> statement-breakpoint
ALTER TABLE "uniref" DROP CONSTRAINT "uniref_guild_guildData_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "uniref_guild_idx";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guildData_guildData_id_fk" FOREIGN KEY ("guildData") REFERENCES "public"."guildData"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uniref_guild_idx" ON "uniref" USING btree ("guildData");--> statement-breakpoint
ALTER TABLE "uniref" ADD CONSTRAINT "uniref_guildData_unique" UNIQUE("guildData");