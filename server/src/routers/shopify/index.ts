import { TRPCError } from '@trpc/server';
import { router } from '../../trpc';
import { fileProcedures } from '../../utils/files';
import { managedWorker } from '../../utils/managedWorker';
import { shopifyConnect } from './connect';
import { KV } from '../../utils/kv';
import { SHOPIFY_LOCATION_ID_STORE, SHOPIFY_LOCATION_ID_WAREHOUSE } from '../../env';
import { shopifyPushRouter } from './push';
import type { RecentlyUpdatedProductsQuery } from '../../../types/admin.generated';

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
				lastUpdatedAt: number =
					parsedLastUpdatedAt && parsedQueryVersion === PRODUCT_QUERY_VERSION
						? parsedLastUpdatedAt >= 5000
							? parsedLastUpdatedAt - 5000
							: parsedLastUpdatedAt
						: 0,
				startTime = Date.now(),
				{ client } = shopifyConnect(),
				bulkOperationCreateRes = await client.request(bulkQueryMutation, {
					variables: {
						query: productsQuery
							.replaceAll('$lastUpdatedAtISOString', new Date(lastUpdatedAt).toISOString())
							.replaceAll('$LOCATION_ID_STORE', SHOPIFY_LOCATION_ID_STORE)
							.replaceAll('$LOCATION_ID_WAREHOUSE', SHOPIFY_LOCATION_ID_WAREHOUSE)
					}
				});

			if (bulkOperationCreateRes.data?.bulkOperationRunQuery?.bulkOperation?.status !== 'CREATED') {
				console.error(JSON.stringify(bulkOperationCreateRes.data, undefined, 2));
				throw new Error('Failed to create bulk operation');
			}

			let bulkQueryResults,
				iterations = 0;
			while (true) {
				const r = await client.request(pollBulkQueryQuery);
				if (iterations % 10 === 0)
					console.log(
						`${Math.round((Date.now() - startTime) / 100) / 10}s elapsed (${
							r.data?.currentBulkOperation?.objectCount
						} objects so far)`
					);
				if (
					r.data?.currentBulkOperation?.status !== 'RUNNING' ||
					r.data?.currentBulkOperation?.status !== 'CREATED'
				) {
					bulkQueryResults = r;
					break;
				}
				await new Promise((resolve) => setTimeout(resolve, 500));
				iterations++;
			}
			if (bulkQueryResults.data?.currentBulkOperation?.status !== 'COMPLETED') {
				console.log(JSON.stringify(bulkQueryResults.data, undefined, 2));
				throw new TRPCError({
					message: `Bulk operation failed (status is ${bulkQueryResults.data?.currentBulkOperation?.status})`,
					code: 'INTERNAL_SERVER_ERROR'
				});
			}
			if (bulkQueryResults.data.currentBulkOperation.objectCount === '0') return null;

			const fileRes = await fetch(bulkQueryResults.data?.currentBulkOperation?.url),
				fileType = fileRes.headers.get('Content-Type'),
				binString = Array.from(new Uint8Array(await fileRes.arrayBuffer()), (byte) =>
					String.fromCodePoint(byte)
				).join(''),
				dataUrl = `data:${fileType};base64,${btoa(binString)}`;

			verify(dataUrl, fileType ?? '');

			await kv.set('lastUpdatedAt', startTime.toString());

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

const PRODUCT_QUERY_VERSION = 3;
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
    deletionEvents(subjectTypes: PRODUCT, query: "occurred_at:>'$lastUpdatedAtISOString'") {
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

const bulkQueryMutation = `#graphql
  mutation genericBulkQuery($query: String!) {
    bulkOperationRunQuery(
     query: $query
    ) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }` as const;

const pollBulkQueryQuery = `#graphql
  query pollBulkOperation {
    currentBulkOperation {
      id
      status
      errorCode
      createdAt
      completedAt
      objectCount
      fileSize
      url
      partialDataUrl
    }
  }
` as const;

export type Product = RecentlyUpdatedProductsQuery['products']['edges'][0]['node'];
export type Variant = Product['variants']['edges'][0]['node'];
export type DeletionEvent = RecentlyUpdatedProductsQuery['deletionEvents']['edges'][0]['node'];
