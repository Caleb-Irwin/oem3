DO $$ BEGIN
 CREATE TYPE "resource_type" AS ENUM('qb');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uniref" (
	"uniId" serial PRIMARY KEY NOT NULL,
	"resource_type" "resource_type",
	"qb" integer
);
--> statement-breakpoint
ALTER TABLE "qb" ADD COLUMN "lastUpdated" integer NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resource_type_idx" ON "uniref" ("uniId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "uniref_qb_idx" ON "uniref" ("qb");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uniref" ADD CONSTRAINT "uniref_qb_qb_id_fk" FOREIGN KEY ("qb") REFERENCES "qb"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
