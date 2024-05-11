DO $$ BEGIN
 CREATE TYPE "qb_item_type" AS ENUM('Service', 'Inventory Part', 'Inventory Assembly', 'Non-inventory Part', 'Other Charge', 'Subtotal', 'Group', 'Discount', 'Sales Tax Item', 'Sales Tax Group');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "qb_um" AS ENUM('ea', 'pk', 'cs');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "tax_code" AS ENUM('S', 'G', 'E');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "qb" (
	"id" serial PRIMARY KEY NOT NULL,
	"qb_id" varchar(256) NOT NULL,
	"desc" text DEFAULT '' NOT NULL,
	"desc_lock" boolean DEFAULT false NOT NULL,
	"type" "qb_item_type" NOT NULL,
	"cost_cents" integer NOT NULL,
	"cost_cents_lock" boolean DEFAULT false NOT NULL,
	"price_cents" integer NOT NULL,
	"price_cents_lock" boolean DEFAULT false NOT NULL,
	"sales_tax_code" "tax_code",
	"purchase_tax_code" "tax_code",
	"account" varchar(256) NOT NULL,
	"account_lock" boolean DEFAULT false NOT NULL,
	"quantity_on_hand" integer,
	"quantity_on_hand_lock" boolean DEFAULT false NOT NULL,
	"quantity_on_sales_order" integer,
	"quantity_on_purchase_order" integer,
	"um" "qb_um",
	"preferred_vendor" varchar(256),
	"deleted" boolean DEFAULT false NOT NULL
);
