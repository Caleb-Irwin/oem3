DROP INDEX "spr_sprcSku_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "spr_sprcSku_idx" ON "sprPriceFile" USING btree ("sprcSku");--> statement-breakpoint
ALTER TABLE "sprPriceFile" ADD CONSTRAINT "sprPriceFile_sprcSku_unique" UNIQUE("sprcSku");