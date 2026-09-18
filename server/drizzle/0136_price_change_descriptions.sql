-- Only use unambiguous active QuickBooks items with the exported item ID.
-- Update generated label names before replacing the saved export titles, so
-- manually edited names can be recognized and preserved.
WITH descriptions AS (
	SELECT "qb_id", min("desc") AS description
	FROM "qb"
	WHERE NOT "deleted"
	GROUP BY "qb_id"
	HAVING count(*) = 1
)
UPDATE "labels" AS label
SET "name" = left(descriptions.description, 256)
FROM "labelSheets" AS sheet, "price_change_export_items" AS item, descriptions
WHERE label."sheet" = sheet."id"
	AND sheet."price_change_export" = item."export_row"
	AND label."qbId" = item."qb_id"
	AND label."barcode" IS NOT DISTINCT FROM left(coalesce(item."barcode", ''), 256)
	AND label."name" IS NOT DISTINCT FROM left(coalesce(item."title", item."product_name", ''), 256)
	AND item."qb_id" = descriptions."qb_id";
--> statement-breakpoint
WITH descriptions AS (
	SELECT "qb_id", min("desc") AS description
	FROM "qb"
	WHERE NOT "deleted"
	GROUP BY "qb_id"
	HAVING count(*) = 1
)
UPDATE "price_change_export_items" AS item
SET "title" = descriptions.description
FROM descriptions
WHERE item."qb_id" = descriptions."qb_id";
