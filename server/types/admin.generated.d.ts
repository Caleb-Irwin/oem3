/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types';

export type GenericBulkQueryMutationVariables = AdminTypes.Exact<{
  query: AdminTypes.Scalars['String']['input'];
}>;


export type GenericBulkQueryMutation = { bulkOperationRunQuery?: AdminTypes.Maybe<{ bulkOperation?: AdminTypes.Maybe<Pick<AdminTypes.BulkOperation, 'id' | 'status'>>, userErrors: Array<Pick<AdminTypes.BulkOperationUserError, 'field' | 'message'>> }> };

export type GenericBulkMutationMutationVariables = AdminTypes.Exact<{
  mutation: AdminTypes.Scalars['String']['input'];
  stagedUploadPath: AdminTypes.Scalars['String']['input'];
}>;


export type GenericBulkMutationMutation = { bulkOperationRunMutation?: AdminTypes.Maybe<{ bulkOperation?: AdminTypes.Maybe<Pick<AdminTypes.BulkOperation, 'id' | 'status'>>, userErrors: Array<Pick<AdminTypes.BulkMutationUserError, 'field' | 'message'>> }> };

export type PollCurrentBulkOperationQueryVariables = AdminTypes.Exact<{
  type?: AdminTypes.InputMaybe<AdminTypes.BulkOperationType>;
}>;


export type PollCurrentBulkOperationQuery = { currentBulkOperation?: AdminTypes.Maybe<Pick<AdminTypes.BulkOperation, 'id' | 'status' | 'errorCode' | 'createdAt' | 'completedAt' | 'objectCount' | 'fileSize' | 'url' | 'partialDataUrl'>> };

export type GetBulkOperationQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type GetBulkOperationQuery = { node?: AdminTypes.Maybe<Pick<AdminTypes.BulkOperation, 'id' | 'status' | 'errorCode' | 'createdAt' | 'completedAt' | 'objectCount' | 'fileSize' | 'url' | 'partialDataUrl'>> };

export type CancelBulkOperationMutationVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type CancelBulkOperationMutation = { bulkOperationCancel?: AdminTypes.Maybe<{ bulkOperation?: AdminTypes.Maybe<Pick<AdminTypes.BulkOperation, 'id' | 'status'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

export type StagedUploadsCreateMutationVariables = AdminTypes.Exact<{
  input: Array<AdminTypes.StagedUploadInput> | AdminTypes.StagedUploadInput;
}>;


export type StagedUploadsCreateMutation = { stagedUploadsCreate?: AdminTypes.Maybe<{ userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>>, stagedTargets?: AdminTypes.Maybe<Array<(
      Pick<AdminTypes.StagedMediaUploadTarget, 'url' | 'resourceUrl'>
      & { parameters: Array<Pick<AdminTypes.StagedUploadParameter, 'name' | 'value'>> }
    )>> }> };

export type RecentlyUpdatedProductsQueryVariables = AdminTypes.Exact<{ [key: string]: never; }>;


export type RecentlyUpdatedProductsQuery = { products: { edges: Array<{ node: (
        Pick<AdminTypes.Product, 'id' | 'handle' | 'title' | 'descriptionHtml' | 'tags' | 'vendor' | 'onlineStoreUrl' | 'onlineStorePreviewUrl' | 'hasOnlyDefaultVariant' | 'publishedAt' | 'status' | 'updatedAt' | 'totalInventory'>
        & { featuredMedia?: AdminTypes.Maybe<(
          Pick<AdminTypes.ExternalVideo, 'id' | 'alt' | 'mediaContentType' | 'status'>
          & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'altText' | 'url'>> }> }
        ) | (
          Pick<AdminTypes.MediaImage, 'id' | 'alt' | 'mediaContentType' | 'status'>
          & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'altText' | 'url'>> }> }
        ) | (
          Pick<AdminTypes.Model3d, 'id' | 'alt' | 'mediaContentType' | 'status'>
          & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'altText' | 'url'>> }> }
        ) | (
          Pick<AdminTypes.Video, 'id' | 'alt' | 'mediaContentType' | 'status'>
          & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'altText' | 'url'>> }> }
        )>, media: { edges: Array<{ node: (
              Pick<AdminTypes.ExternalVideo, 'id' | 'alt' | 'mediaContentType' | 'status'>
              & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'altText' | 'url'>> }> }
            ) | (
              Pick<AdminTypes.MediaImage, 'id' | 'alt' | 'mediaContentType' | 'status'>
              & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'altText' | 'url'>> }> }
            ) | (
              Pick<AdminTypes.Model3d, 'id' | 'alt' | 'mediaContentType' | 'status'>
              & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'altText' | 'url'>> }> }
            ) | (
              Pick<AdminTypes.Video, 'id' | 'alt' | 'mediaContentType' | 'status'>
              & { preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'altText' | 'url'>> }> }
            ) }> }, variants: { edges: Array<{ node: (
              Pick<AdminTypes.ProductVariant, 'id' | 'price' | 'compareAtPrice' | 'sku' | 'barcode' | 'inventoryPolicy'>
              & { inventoryItem: (
                Pick<AdminTypes.InventoryItem, 'requiresShipping'>
                & { measurement: { weight?: AdminTypes.Maybe<Pick<AdminTypes.Weight, 'value' | 'unit'>> }, unitCost?: AdminTypes.Maybe<Pick<AdminTypes.MoneyV2, 'amount'>>, store0?: AdminTypes.Maybe<{ quantities: Array<Pick<AdminTypes.InventoryQuantity, 'quantity'>> }>, warehouse0?: AdminTypes.Maybe<{ quantities: Array<Pick<AdminTypes.InventoryQuantity, 'quantity'>> }> }
              ) }
            ) }> } }
      ) }> }, deletionEvents: { edges: Array<{ node: Pick<AdminTypes.DeletionEvent, 'occurredAt' | 'subjectId' | 'subjectType'> }> } };

interface GeneratedQueryTypes {
  "#graphql\n  query pollCurrentBulkOperation($type: BulkOperationType) {\n    currentBulkOperation(type: $type) {\n      id\n      status\n      errorCode\n      createdAt\n      completedAt\n      objectCount\n      fileSize\n      url\n      partialDataUrl\n    }\n  }\n": {return: PollCurrentBulkOperationQuery, variables: PollCurrentBulkOperationQueryVariables},
  "#graphql\n  query getBulkOperation($id: ID!) {\n    node(id: $id) {\n      ... on BulkOperation {\n        id\n        status\n        errorCode\n        createdAt\n        completedAt\n        objectCount\n        fileSize\n        url\n        partialDataUrl\n      }\n    }\n  }\n": {return: GetBulkOperationQuery, variables: GetBulkOperationQueryVariables},
  "#graphql\n  query recentlyUpdatedProducts {\n    products(query: \"updated_at:>'$lastUpdatedAtISOString'\") {\n      edges {\n        node {\n          id\n          handle\n          title\n          descriptionHtml\n          tags\n          vendor\n          onlineStoreUrl\n          onlineStorePreviewUrl\n          hasOnlyDefaultVariant\n          publishedAt\n          status\n          updatedAt\n          featuredMedia {\n            id\n            alt\n            mediaContentType\n            status\n            preview {\n              image {\n                altText\n                url\n              }\n            }\n          }\n          media {\n            edges {\n              node {\n                id\n                alt\n                mediaContentType\n                status\n                preview {\n                  image {\n                    altText\n                    url\n                  }\n                }\n              }\n            }\n          }\n          totalInventory\n          variants(first: 1) {\n            edges {\n              node {\n                id\n                price\n                compareAtPrice\n                sku\n                barcode\n                inventoryPolicy\n                inventoryItem {\n                  measurement {\n                    weight {\n                      value\n                      unit\n                    }\n                  }\n                  requiresShipping\n                  unitCost {\n                    amount\n                  }\n                  store0: inventoryLevel(locationId: \"$LOCATION_ID_STORE\") {\n                    quantities(names: [\"available\", \"on_hand\", \"committed\"]) {\n                      quantity\n                    }\n                  }\n                  warehouse0: inventoryLevel(locationId: \"$LOCATION_ID_WAREHOUSE\") {\n                    quantities(names: [\"on_hand\"]) {\n                      quantity\n                    }\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n    deletionEvents(subjectTypes: PRODUCT, query: \"occurred_at:>'$lastUpdatedAtISOString'\") {\n      edges {\n        node {\n          occurredAt\n          subjectId\n          subjectType\n        }\n      }\n    }\n  }\n": {return: RecentlyUpdatedProductsQuery, variables: RecentlyUpdatedProductsQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n  mutation genericBulkQuery($query: String!) {\n    bulkOperationRunQuery(query: $query) {\n      bulkOperation {\n        id\n        status\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: GenericBulkQueryMutation, variables: GenericBulkQueryMutationVariables},
  "#graphql\n  mutation genericBulkMutation($mutation: String!, $stagedUploadPath: String!) {\n    bulkOperationRunMutation(\n      mutation: $mutation\n      stagedUploadPath: $stagedUploadPath\n    ) {\n      bulkOperation {\n        id\n        status\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: GenericBulkMutationMutation, variables: GenericBulkMutationMutationVariables},
  "#graphql\n  mutation cancelBulkOperation($id: ID!) {\n    bulkOperationCancel(id: $id) {\n      bulkOperation {\n        id\n        status\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: CancelBulkOperationMutation, variables: CancelBulkOperationMutationVariables},
  "#graphql\n  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {\n    stagedUploadsCreate(input: $input) {\n      userErrors {\n        field\n        message\n      }\n      stagedTargets {\n        url\n        resourceUrl\n        parameters {\n          name\n          value\n        }\n      }\n    }\n  }\n": {return: StagedUploadsCreateMutation, variables: StagedUploadsCreateMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
