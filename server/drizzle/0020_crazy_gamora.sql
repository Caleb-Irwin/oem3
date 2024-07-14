CREATE TABLE IF NOT EXISTS "search" (
	"id" serial PRIMARY KEY NOT NULL,
	"uniref" integer NOT NULL,
	"type" "resource_type" NOT NULL,
	"keyInfo" text NOT NULL,
	"otherInfo" text NOT NULL,
	CONSTRAINT "search_uniref_unique" UNIQUE("uniref")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "search" ADD CONSTRAINT "search_uniref_uniref_uniId_fk" FOREIGN KEY ("uniref") REFERENCES "public"."uniref"("uniId") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_index" ON "search" USING gin ((
          setweight(to_tsvector('english', "keyInfo"), 'A') ||
          setweight(to_tsvector('english', "otherInfo"), 'B')
      ));