DO $$ BEGIN
 CREATE TYPE "changeset_status_type" AS ENUM('generating', 'current', 'completed', 'cancelled', 'partiallyCancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "changes" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "changesets" ADD COLUMN "status" "changeset_status_type" NOT NULL;