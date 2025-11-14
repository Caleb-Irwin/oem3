import {
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	bigint,
	uniqueIndex,
	varchar
} from 'drizzle-orm/pg-core';
import { unifiedProduct } from '../../product/table';

export const shopifyUploadStatusEnum = pgEnum('shopify_upload_status', [
	'PENDING',
	'UPLOADED',
	'FAILED'
]);

export const shopifyMetadata = pgTable(
	'shopifyMetadata',
	{
		id: serial('id').primaryKey(),
		productId: integer('product_id')
			.references(() => unifiedProduct.id, {
				onDelete: 'cascade'
			})
			.unique(),
		shopifyProductId: varchar('shopify_product_id', { length: 256 }),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull(),
		status: shopifyUploadStatusEnum('status').notNull(),
		failureCount: integer('failure_count').notNull().default(0)
	},
	(table) => [
		uniqueIndex('shopify_metadata_product_id_idx').on(table.productId),
		index('shopify_metadata_shopify_product_id_idx').on(table.shopifyProductId)
	]
);
