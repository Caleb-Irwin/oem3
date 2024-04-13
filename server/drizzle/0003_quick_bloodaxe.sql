ALTER TABLE "labelSheets" ADD COLUMN "owner" varchar(256);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "labelSheets" ADD CONSTRAINT "labelSheets_owner_users_username_fk" FOREIGN KEY ("owner") REFERENCES "users"("username") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
