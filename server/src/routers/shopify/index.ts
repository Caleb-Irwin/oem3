import { TRPCError } from '@trpc/server';
import { router } from '../../trpc';
import { fileProcedures } from '../../utils/files';
import { managedWorker } from '../../utils/managedWorker';
import { KV } from '../../utils/kv';
import { SHOPIFY_LOCATION_ID_STORE, SHOPIFY_LOCATION_ID_WAREHOUSE } from '../../env';
import { shopifyPushRouter } from './push';
import type { RecentlyUpdatedProductsQuery } from '../../../types/admin.generated';
import { createBulkQuery, pollBulkOperation } from './bulk';

const { worker, runWorker, hook } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'shopify',
	[],
	undefined,
	1
);

export const shopifyHook = hook;

const verify = (dataUrl: string, fileType: string) => {
	if (fileType !== 'application/jsonl') throw new Error('Invalid File Type (JSON Only)');
	const firstLine = atob(dataUrl.slice(dataUrl.indexOf(';base64,') + 8)).split('\n')[0];
	const data = JSON.parse(firstLine);
	if (!(data.id || data.subjectId)) {
		console.log(data);
		throw new Error('Invalid File (Missing IDs)');
	}
};
export const shopifyRouter = router({
	pushSync: shopifyPushRouter,
	worker,
	files: fileProcedures(
		'shopify',
		verify,
		runWorker,
		async () => {
			const kv = new KV('shopify'),
				kvLastUpdatedAt = await kv.get('lastUpdatedAt'),
				kvQueryVersion = await kv.get('productQueryVersion'),
				parsedQueryVersion = kvQueryVersion ? parseInt(kvQueryVersion) : null,
				parsedLastUpdatedAt = kvLastUpdatedAt ? parseInt(kvLastUpdatedAt) : null,
				startTime = Date.now();

			// Determine lastUpdatedAt: use stored value with margin if query version matches, otherwise start from 0
			let lastUpdatedAt: number;
			if (parsedQueryVersion === PRODUCT_QUERY_VERSION && parsedLastUpdatedAt !== null) {
				// Rolling updates: use last updated time minus 5 second margin to catch any edge cases
				lastUpdatedAt = parsedLastUpdatedAt >= 5000 ? parsedLastUpdatedAt - 5000 : 0;
			} else {
				// Query version changed or first run: get all products
				lastUpdatedAt = 0;
			}

			// Create bulk query operation
			const bulkOperation = await createBulkQuery(
				productsQuery
					.replaceAll('$lastUpdatedAtISOString', new Date(lastUpdatedAt).toISOString())
					.replaceAll('$LOCATION_ID_STORE', SHOPIFY_LOCATION_ID_STORE)
					.replaceAll('$LOCATION_ID_WAREHOUSE', SHOPIFY_LOCATION_ID_WAREHOUSE)
			);

			if (bulkOperation.status !== 'CREATED') {
				console.error(JSON.stringify(bulkOperation, undefined, 2));
				throw new Error('Failed to create bulk operation');
			}

			// Poll until complete with progress logging
			const result = await pollBulkOperation(
				'query',
				500,
				undefined,
				(objectCount, elapsedSeconds) => {
					console.log(`${elapsedSeconds}s elapsed (${objectCount} objects so far)`);
				}
			);

			if (result.status !== 'COMPLETED') {
				console.log(JSON.stringify(result, undefined, 2));
				throw new TRPCError({
					message: `Bulk operation failed (status is ${result.status})`,
					code: 'INTERNAL_SERVER_ERROR'
				});
			}

			if (result.objectCount === '0') return null;

			// Download and convert results to data URL
			if (!result.url) {
				throw new TRPCError({
					message: 'Bulk operation completed but no URL available',
					code: 'INTERNAL_SERVER_ERROR'
				});
			}

			const fileRes = await fetch(result.url),
				fileType = fileRes.headers.get('Content-Type'),
				binString = Array.from(new Uint8Array(await fileRes.arrayBuffer()), (byte) =>
					String.fromCodePoint(byte)
				).join(''),
				dataUrl = `data:${fileType};base64,${btoa(binString)}`;

			verify(dataUrl, fileType ?? '');

			// Update KV with current time and query version
			await kv.set('lastUpdatedAt', startTime.toString());
			await kv.set('productQueryVersion', PRODUCT_QUERY_VERSION.toString());

			return {
				name:
					`Changes from ${new Date(lastUpdatedAt).toLocaleString('en-CA', {
						timeZone: 'America/Regina'
					})} to ${new Date(startTime).toLocaleString('en-CA', {
						timeZone: 'America/Regina'
					})}`.replaceAll('.', '') + '.jsonl',
				dataUrl
			};
		},
		true
	)
});

const PRODUCT_QUERY_VERSION = 5;
const productsQuery = `#graphql
  query recentlyUpdatedProducts {
    products(query: "updated_at:>'$lastUpdatedAtISOString'") {
      edges {
        node {
          id
          handle
          title
          descriptionHtml
          tags
          vendor
          onlineStoreUrl
          onlineStorePreviewUrl
          hasOnlyDefaultVariant
          publishedAt
          status
          updatedAt
          productType
          featuredMedia {
            id
            alt
            mediaContentType
            status
            preview {
              image {
                altText
                url
              }
            }
          }
          media {
            edges {
              node {
                id
                alt
                mediaContentType
                status
                preview {
                  image {
                    altText
                    url
                  }
                }
              }
            }
          }
          totalInventory
          variants(first: 1) {
            edges {
              node {
                id
                price
                compareAtPrice
                sku
                barcode
                inventoryPolicy
                inventoryItem {
                  id
                  measurement {
                    weight {
                      value
                      unit
                    }
                  }
                  requiresShipping
                  unitCost {
                    amount
                  }
                  store0: inventoryLevel(locationId: "$LOCATION_ID_STORE") {
                    quantities(names: ["available", "on_hand", "committed"]) {
                      quantity
                    }
                  }
                  warehouse0: inventoryLevel(locationId: "$LOCATION_ID_WAREHOUSE") {
                    quantities(names: ["on_hand"]) {
                      quantity
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    deletionEvents(
      subjectTypes: PRODUCT
      query: "occurred_at:>'$lastUpdatedAtISOString'"
    ) {
      edges {
        node {
          occurredAt
          subjectId
          subjectType
        }
      }
    }
  }
` as const;

export type Product = RecentlyUpdatedProductsQuery['products']['edges'][0]['node'];
export type Variant = Product['variants']['edges'][0]['node'];
export type DeletionEvent = RecentlyUpdatedProductsQuery['deletionEvents']['edges'][0]['node'];
