ALTER TABLE "files" DROP CONSTRAINT "files_author_users_username_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_author_users_username_fk" FOREIGN KEY ("author") REFERENCES "public"."users"("username") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
