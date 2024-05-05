CREATE TABLE IF NOT EXISTS "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"type" varchar(256),
	"author" varchar(256),
	"content" text,
	"uploadedTime" bigint
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_id_idx" ON "files" ("id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_author_users_username_fk" FOREIGN KEY ("author") REFERENCES "users"("username") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
