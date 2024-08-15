/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type RecentlyUpdatedProductsQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type RecentlyUpdatedProductsQuery = { products: { edges: Array<{ node: (
        Pick<AdminTypes.Product, 'id' | 'handle' | 'title' | 'description' | 'tags' | 'hasOnlyDefaultVariant' | 'publishedAt' | 'status' | 'updatedAt' | 'totalInventory'>
        & { featuredImage?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'id' | 'altText' | 'url'>>, variants: { edges: Array<{ node: (
              Pick<AdminTypes.ProductVariant, 'id' | 'price' | 'compareAtPrice' | 'sku' | 'barcode' | 'inventoryPolicy'>
              & { inventoryItem: (
                Pick<AdminTypes.InventoryItem, 'requiresShipping'>
                & { measurement: { weight?: AdminTypes.Maybe<Pick<AdminTypes.Weight, 'value' | 'unit'>> }, unitCost?: AdminTypes.Maybe<Pick<AdminTypes.MoneyV2, 'amount'>>, store0?: AdminTypes.Maybe<{ quantities: Array<Pick<AdminTypes.InventoryQuantity, 'quantity'>> }>, warehouse0?: AdminTypes.Maybe<{ quantities: Array<Pick<AdminTypes.InventoryQuantity, 'quantity'>> }> }
              ) }
            ) }> } }
      ) }> }, deletionEvents: { edges: Array<{ node: Pick<AdminTypes.DeletionEvent, 'occurredAt' | 'subjectId' | 'subjectType'> }> } };

export type GenericBulkQueryMutationVariables = AdminTypes.Exact<{
  query: AdminTypes.Scalars['String']['input'];
}>;


export type GenericBulkQueryMutation = { bulkOperationRunQuery?: AdminTypes.Maybe<{ bulkOperation?: AdminTypes.Maybe<Pick<AdminTypes.BulkOperation, 'id' | 'status'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type PollBulkOperationQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type PollBulkOperationQuery = { currentBulkOperation?: AdminTypes.Maybe<Pick<AdminTypes.BulkOperation, 'id' | 'status' | 'errorCode' | 'createdAt' | 'completedAt' | 'objectCount' | 'fileSize' | 'url' | 'partialDataUrl'>> };

interface GeneratedQueryTypes {
  "#graphql\n  query recentlyUpdatedProducts {\n    products(query: \"updated_at:>'$lastUpdatedAtISOString'\") {\n      edges {\n        node {\n          id\n          handle\n          title\n          description\n          tags\n          hasOnlyDefaultVariant\n          publishedAt\n          status\n          updatedAt\n          featuredImage {\n            id\n            altText\n            url\n          }\n          totalInventory\n          variants(first: 1) {\n            edges {\n              node {\n                id\n                price\n                compareAtPrice\n                sku\n                barcode\n                inventoryPolicy\n                inventoryItem {\n                  measurement {\n                    weight {\n                      value\n                      unit\n                    }\n                  }\n                  requiresShipping\n                  unitCost {\n                    amount\n                  }\n                  store0: inventoryLevel(locationId: \"gid://shopify/Location/64080085182\") {\n                    quantities(names: [\"available\", \"on_hand\", \"committed\"]) {\n                      quantity\n                    }\n                  }\n                  warehouse0: inventoryLevel(locationId: \"gid://shopify/Location/68291231934\") {\n                    quantities(names: [\"on_hand\"]) {\n                      quantity\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n    deletionEvents(subjectTypes: PRODUCT, query: \"occurred_at:>'$lastUpdatedAtISOString'\") {\n      edges {\n        node {\n          occurredAt\n          subjectId\n          subjectType\n        }\n      }\n    }\n  }\n": {return: RecentlyUpdatedProductsQuery, variables: RecentlyUpdatedProductsQueryVariables},
  "#graphql\n  query pollBulkOperation {\n    currentBulkOperation {\n      id\n      status\n      errorCode\n      createdAt\n      completedAt\n      objectCount\n      fileSize\n      url\n      partialDataUrl\n    }\n  }\n": {return: PollBulkOperationQuery, variables: PollBulkOperationQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n  mutation genericBulkQuery($query: String!) {\n    bulkOperationRunQuery(\n     query: $query\n    ) {\n      bulkOperation {\n        id\n        status\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }": {return: GenericBulkQueryMutation, variables: GenericBulkQueryMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
