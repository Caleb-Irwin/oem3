DROP INDEX "spr_sprcSku_idx";--> statement-breakpoint
CREATE INDEX "spr_sprcSku_idx" ON "sprPriceFile" USING btree ("sprcSku");