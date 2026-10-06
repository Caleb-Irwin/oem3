import { and, eq, isNull, ne } from 'drizzle-orm';
import { db } from '../../../db';
import { KV } from '../../../utils/kv';
import { unifiedProduct } from '../../product/table';
import { shopify } from '../table';
import { executeBulkMutation } from '../bulk';
import { shopifyMetadata } from './shopifyMetadata.table';
import { isOem3Listing, listingsToArchive } from './listingEligibility';
import type { ProductSetInput } from '../../../../types/admin.types';
import { ProductStatus } from './types';
import { whileMatchingPaused } from '../../../unified/matchingLock';
import { productUnifier } from '../../product/productUnifier';

/**
 * Archives OEM3 listings whose product no longer exists, e.g. after the unifier deletes it.
 * Listings without the OEM3 tag were not created by OEM3 and are left alone. See
 * listingsToArchive for how long a listing must stay unmatched first. Returns how many it archived.
 */
export async function archiveUnmatchedListings() {
	// Matching could otherwise connect a listing to a product while it is being archived
	const ran = await whileMatchingPaused('unifiedProduct', archiveWhileMatchingPaused);
	if (!ran) console.log('Not archiving unmatched listings while products are being matched.');
	return ran?.result ?? 0;
}

async function archiveWhileMatchingPaused(): Promise<number> {
	const unifierKv = new KV<'runStarted' | 'runFinished' | 'unconnectedMatchedAt'>(
		'unifier/unifiedProduct'
	);
	const runStarted = await unifierKv.get('runStarted');
	// A run in progress can delete a product before connecting its listing to another one
	if (!runStarted || runStarted !== (await unifierKv.get('runFinished'))) {
		console.log('Not archiving unmatched listings while the product unifier is running.');
		return 0;
	}

	const unmatched = (
		await db
			.select({
				productId: shopify.productId,
				tagsJsonArr: shopify.tagsJsonArr,
				lastUpdated: shopify.lastUpdated
			})
			.from(shopify)
			.leftJoin(unifiedProduct, eq(unifiedProduct.shopifyRow, shopify.id))
			// A listing created by a push is not linked until the next Shopify sync and unifier run
			.leftJoin(shopifyMetadata, eq(shopifyMetadata.shopifyProductId, shopify.productId))
			.where(
				and(
					isNull(unifiedProduct.id),
					isNull(shopifyMetadata.id),
					eq(shopify.deleted, false),
					ne(shopify.status, 'ARCHIVED')
				)
			)
	).filter((row) => isOem3Listing(row.tagsJsonArr));

	const pushKv = new KV<'unmatchedSince'>('shopifyPush');
	const { toArchive, unmatchedSince } = listingsToArchive(
		unmatched,
		JSON.parse((await pushKv.get('unmatchedSince')) ?? '{}'),
		JSON.parse((await unifierKv.get('unconnectedMatchedAt')) ?? '{}')['shopifyRow'],
		Date.now()
	);
	await pushKv.set('unmatchedSince', JSON.stringify(unmatchedSince));
	// The rest wait for a run that matches products against them, which happens on its own only
	// once Shopify listings change
	if (toArchive.length < unmatched.length) {
		await productUnifier.requestUnconnectedRematch('shopifyRow');
	}
	if (toArchive.length === 0) return 0;

	console.log(`Archiving ${toArchive.length} OEM3 Shopify listings with no matching product.`);

	const mutation = `#graphql
		mutation productArchive($input: ProductSetInput!) {
			productSet(input: $input) {
				product {
					id
				}
				userErrors {
					field
					message
				}
			}
		}
	`;
	const variables = toArchive.map((row) => {
		const input: ProductSetInput = { status: ProductStatus.Archived };
		//@ts-expect-error This field exists but it is deprecated. However, it is needed for bulk mutations still.
		input.id = row.productId;
		return { input };
	});
	const results = await executeBulkMutation(mutation, variables, 'archive_products.jsonl');

	for (const { data, errors, __lineNumber } of results) {
		const lineErrors = [...(errors ?? []), ...(data?.productSet?.userErrors ?? [])];
		if (lineErrors.length > 0) {
			console.error(
				`Failed to archive Shopify product ${toArchive[__lineNumber]?.productId}:`,
				JSON.stringify(lineErrors)
			);
		}
	}
	return toArchive.length;
}
