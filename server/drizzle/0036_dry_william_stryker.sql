DROP INDEX IF EXISTS "qb_shortUpc_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qb_shortUpc_idx" ON "qb" USING btree (substr(substr((qb.qb_id)::text, (POSITION((':'::text) IN (qb.qb_id)) + 1)), (length(substr((qb.qb_id)::text, (POSITION((':'::text) IN (qb.qb_id)) + 1))) - 10), 10));