CREATE TABLE "unmatchedErrors" (
	"id" serial PRIMARY KEY NOT NULL,
	"uniId" integer NOT NULL,
	"allow_unmatched" boolean DEFAULT false NOT NULL,
	"created" bigint NOT NULL,
	CONSTRAINT "unmatchedErrors_uniId_unique" UNIQUE("uniId")
);
--> statement-breakpoint
ALTER TABLE "unmatchedErrors" ADD CONSTRAINT "unmatchedErrors_uniId_uniref_uniId_fk" FOREIGN KEY ("uniId") REFERENCES "public"."uniref"("uniId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unmatched_errors_uniId_idx" ON "unmatchedErrors" USING btree ("uniId");