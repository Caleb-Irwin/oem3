import { eq, isNull } from 'drizzle-orm';
import { db } from '../../../db';
import { unifiedProduct } from '../../product/table';
import { shopify } from '../table';
import { executeBulkMutation } from '../bulk';
import { TRPCError } from '@trpc/server';

export async function archiveUnmatchedProducts() {
	await db.transaction(async (tx) => {
		const res = await tx
			.select()
			.from(shopify)
			.leftJoin(unifiedProduct, eq(unifiedProduct.shopifyRow, shopify.id))
			.where(isNull(unifiedProduct.id));

		console.log(`Archiving ${res.length} unmatched Shopify products`);

		const productsToArchive = res.filter((r) => r.shopify.status !== 'ARCHIVED');

		console.log(`Found ${productsToArchive.length} products to archive`);

		if (productsToArchive.length === 0) {
			console.log('No products to archive');
			throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No products to archive' });
		}

		// Prepare bulk mutation variables
		const variables = productsToArchive.map((row) => ({
			input: {
				id: row.shopify.productId,
				status: 'ARCHIVED'
			}
		}));

		// GraphQL mutation for productSet
		const mutation = `#graphql
			mutation productSet($input: ProductSetInput!) {
				productSet(input: $input) {
					product {
						id
						status
					}
					userErrors {
						field
						message
					}
				}
			}
		`;

		console.log(`Executing bulk mutation to archive ${productsToArchive.length} products...`);

		// Execute bulk mutation
		const results = await executeBulkMutation(
			mutation,
			variables,
			'archive_products.jsonl',
			500,
			(objectCount, elapsedSeconds) => {
				console.log(`Progress: ${objectCount} products processed (${elapsedSeconds}s elapsed)`);
			}
		);

		console.log(`Bulk mutation completed. ${results.length} results returned.`);

		// Log any errors
		const errors = results.filter((r: any) => r.userErrors && r.userErrors.length > 0);
		if (errors.length > 0) {
			console.error(`Encountered ${errors.length} errors:`, errors);
		}
	});
}
