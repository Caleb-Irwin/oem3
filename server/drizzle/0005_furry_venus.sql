ALTER TABLE "labelSheets" DROP CONSTRAINT "labelSheets_owner_users_username_fk";
--> statement-breakpoint
ALTER TABLE "labels" DROP CONSTRAINT "labels_sheet_labelSheets_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "labelSheets" ADD CONSTRAINT "labelSheets_owner_users_username_fk" FOREIGN KEY ("owner") REFERENCES "users"("username") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "labels" ADD CONSTRAINT "labels_sheet_labelSheets_id_fk" FOREIGN KEY ("sheet") REFERENCES "labelSheets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
