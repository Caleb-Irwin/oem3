import {
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	varchar
} from 'drizzle-orm/pg-core';
import { unifiedProduct } from '../../product/table';

export const shopifyImageEnum = pgEnum('shopify_image_status', [
	'FAILED',
	'PROCESSING',
	'READY',
	'UPLOADED'
]);

export const shopifyMedia = pgTable(
	'shopify_media',
	{
		id: serial('id').primaryKey(),
		originalUploadUrl: text('original_upload_url').notNull(),
		status: shopifyImageEnum('status').notNull(),
		shopifyMediaId: varchar('shopify_media_id', { length: 256 }).unique(),
		shopifyPreviewUrl: text('shopify_preview_url'),
		uploadDate: timestamp('upload_date').notNull().defaultNow(),
		productId: integer('product_id').references(() => unifiedProduct.id, {
			onDelete: 'set null'
		})
	},
	(table) => [
		index('shopify_media_original_url_idx').on(table.originalUploadUrl),
		uniqueIndex('shopify_media_id_idx').on(table.shopifyMediaId)
	]
);
