DROP INDEX "unifiedSpr_spr_sprcSku_idx";--> statement-breakpoint
CREATE INDEX "unifiedSpr_spr_sprcSku_idx" ON "unifiedSpr" USING btree ("sprcSku");