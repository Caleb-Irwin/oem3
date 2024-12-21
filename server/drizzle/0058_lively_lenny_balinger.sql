DO $$ BEGIN
 CREATE TYPE "public"."category" AS ENUM('officeSchool', 'technology', 'furniture', 'cleaningBreakRoom', 'inkToner');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "unifiedGuild" ADD COLUMN "category" "category";