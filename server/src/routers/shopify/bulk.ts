import { TRPCError } from '@trpc/server';
import { shopifyConnect } from './connect';
import type {
	GenericBulkQueryMutation,
	GenericBulkMutationMutation,
	PollCurrentBulkOperationQuery,
	GetBulkOperationQuery,
	CancelBulkOperationMutation,
	StagedUploadsCreateMutation
} from '../../../types/admin.generated';

/**
 * Shopify Bulk Operations Utility
 *
 * This module provides utilities for performing bulk operations with the Shopify GraphQL Admin API.
 * Supports both bulk queries (fetching large datasets) and bulk mutations (importing large volumes of data).
 *
 * @see https://shopify.dev/docs/api/usage/bulk-operations/queries
 * @see https://shopify.dev/docs/api/usage/bulk-operations/imports
 */

// Type definitions for bulk operations
export type BulkOperationType = 'query' | 'mutation';

// Extract the actual BulkOperation type from the generated query
export type BulkOperationResult = NonNullable<
	PollCurrentBulkOperationQuery['currentBulkOperation']
>;

export interface BulkOperationWebhookPayload {
	admin_graphql_api_id: string;
	completed_at: string;
	created_at: string;
	error_code: string | null;
	status: string;
	type: 'query' | 'mutation';
}

// Use the generated StagedTarget type
export type StagedUploadTarget = NonNullable<
	NonNullable<StagedUploadsCreateMutation['stagedUploadsCreate']>['stagedTargets']
>[number];

// GraphQL mutation for creating a bulk query operation
const bulkQueryMutation = `#graphql
  mutation genericBulkQuery($query: String!) {
    bulkOperationRunQuery(query: $query) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
` as const;

// GraphQL mutation for creating a bulk mutation operation
const bulkMutationMutation = `#graphql
  mutation genericBulkMutation($mutation: String!, $stagedUploadPath: String!) {
    bulkOperationRunMutation(
      mutation: $mutation
      stagedUploadPath: $stagedUploadPath
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
  }
` as const;

// GraphQL query to poll bulk operation status
const pollBulkOperationQuery = `#graphql
  query pollCurrentBulkOperation($type: BulkOperationType) {
    currentBulkOperation(type: $type) {
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

// GraphQL query to get specific bulk operation by ID
const getBulkOperationQuery = `#graphql
  query getBulkOperation($id: ID!) {
    node(id: $id) {
      ... on BulkOperation {
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
  }
` as const;

// GraphQL mutation to cancel a bulk operation
const cancelBulkOperationMutation = `#graphql
  mutation cancelBulkOperation($id: ID!) {
    bulkOperationCancel(id: $id) {
      bulkOperation {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
` as const;

// GraphQL mutation to create staged uploads
const stagedUploadsCreateMutation = `#graphql
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      userErrors {
        field
        message
      }
      stagedTargets {
        url
        resourceUrl
        parameters {
          name
          value
        }
      }
    }
  }
` as const;

/**
 * Create a bulk query operation
 *
 * @param query - GraphQL query string to execute in bulk
 * @returns Bulk operation ID and initial status
 */
export async function createBulkQuery(query: string) {
	const { client } = shopifyConnect();

	const response = await client.request<GenericBulkQueryMutation>(bulkQueryMutation, {
		variables: { query }
	});

	if (!response.data?.bulkOperationRunQuery?.bulkOperation) {
		console.error('Failed to create bulk query:', response.data?.bulkOperationRunQuery?.userErrors);
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'Failed to create bulk query operation'
		});
	}

	return response.data.bulkOperationRunQuery.bulkOperation;
}

/**
 * Create a bulk mutation operation
 *
 * @param mutation - GraphQL mutation string to execute in bulk
 * @param stagedUploadPath - Path to the uploaded JSONL file with variables
 * @returns Bulk operation ID and initial status
 */
export async function createBulkMutation(mutation: string, stagedUploadPath: string) {
	const { client } = shopifyConnect();

	const response = await client.request<GenericBulkMutationMutation>(bulkMutationMutation, {
		variables: { mutation, stagedUploadPath }
	});

	if (!response.data?.bulkOperationRunMutation?.bulkOperation) {
		console.error(
			'Failed to create bulk mutation:',
			response.data?.bulkOperationRunMutation?.userErrors
		);
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'Failed to create bulk mutation operation'
		});
	}

	return response.data.bulkOperationRunMutation.bulkOperation;
}

/**
 * Poll a bulk operation until it completes
 *
 * @param type - Type of bulk operation to poll ('query' or 'mutation')
 * @param pollInterval - Interval in milliseconds between polls (default: 500ms)
 * @param maxDuration - Maximum duration in milliseconds to poll (default: 10 minutes)
 * @param onProgress - Optional callback to report progress
 * @returns Final bulk operation result
 */
export async function pollBulkOperation(
	type: BulkOperationType,
	pollInterval: number = 500,
	maxDuration: number = 10 * 60 * 1000,
	onProgress?: (objectCount: string, elapsedSeconds: number) => void
): Promise<BulkOperationResult> {
	const { client } = shopifyConnect();
	const startTime = Date.now();
	let iterations = 0;

	while (true) {
		const elapsed = Date.now() - startTime;

		// Check if we've exceeded max duration
		if (elapsed > maxDuration) {
			throw new TRPCError({
				code: 'TIMEOUT',
				message: `Bulk operation polling exceeded maximum duration of ${maxDuration / 1000}s`
			});
		}

		const response = await client.request<PollCurrentBulkOperationQuery>(pollBulkOperationQuery, {
			variables: { type: type.toUpperCase() }
		});

		const operation = response.data?.currentBulkOperation;

		if (!operation) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'No current bulk operation found'
			});
		}

		// Log progress every 10 iterations
		if (iterations % 10 === 0 && onProgress) {
			onProgress(operation.objectCount, Math.round(elapsed / 100) / 10);
		}

		// Check if operation is complete
		if (operation.status !== 'RUNNING' && operation.status !== 'CREATED') {
			return operation;
		}

		await new Promise((resolve) => setTimeout(resolve, pollInterval));
		iterations++;
	}
}

/**
 * Get a specific bulk operation by ID
 *
 * @param id - Bulk operation ID (e.g., "gid://shopify/BulkOperation/123")
 * @returns Bulk operation details
 */
export async function getBulkOperation(id: string): Promise<BulkOperationResult> {
	const { client } = shopifyConnect();

	const response = await client.request<GetBulkOperationQuery>(getBulkOperationQuery, {
		variables: { id }
	});

	if (!response.data?.node) {
		throw new TRPCError({
			code: 'NOT_FOUND',
			message: `Bulk operation with ID ${id} not found`
		});
	}

	return response.data.node;
}

/**
 * Cancel a running bulk operation
 *
 * @param id - Bulk operation ID to cancel
 * @returns Canceled operation status
 */
export async function cancelBulkOperation(id: string) {
	const { client } = shopifyConnect();

	const response = await client.request<CancelBulkOperationMutation>(cancelBulkOperationMutation, {
		variables: { id }
	});

	if (!response.data?.bulkOperationCancel?.bulkOperation) {
		console.error(
			'Failed to cancel bulk operation:',
			response.data?.bulkOperationCancel?.userErrors
		);
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'Failed to cancel bulk operation'
		});
	}

	return response.data.bulkOperationCancel.bulkOperation;
}

/**
 * Create staged upload for bulk mutation variables
 *
 * @param filename - Name of the file to upload
 * @returns Upload URL and parameters for multipart form upload
 */
export async function createStagedUpload(filename: string): Promise<StagedUploadTarget> {
	const { client } = shopifyConnect();

	const response = await client.request<StagedUploadsCreateMutation>(stagedUploadsCreateMutation, {
		variables: {
			input: [
				{
					resource: 'BULK_MUTATION_VARIABLES',
					filename,
					mimeType: 'text/jsonl',
					httpMethod: 'POST'
				}
			]
		}
	});

	if (!response.data?.stagedUploadsCreate?.stagedTargets?.[0]) {
		console.error(
			'Failed to create staged upload:',
			response.data?.stagedUploadsCreate?.userErrors
		);
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'Failed to create staged upload'
		});
	}

	return response.data.stagedUploadsCreate.stagedTargets[0];
}

/**
 * Upload JSONL file to staged upload URL
 *
 * @param uploadUrl - URL from createStagedUpload
 * @param parameters - Parameters from createStagedUpload
 * @param fileContent - JSONL file content as string
 * @returns Upload result
 */
export async function uploadToStaged(
	uploadUrl: string,
	parameters: Array<{ name: string; value: string }>,
	fileContent: string
) {
	const formData = new FormData();

	// Add all parameters to form data
	parameters.forEach((param) => {
		formData.append(param.name, param.value);
	});

	// Add file content (must be last)
	const blob = new Blob([fileContent], { type: 'text/jsonl' });
	formData.append('file', blob);

	const response = await fetch(uploadUrl, {
		method: 'POST',
		body: formData
	});

	if (!response.ok) {
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: `Failed to upload file: ${response.statusText}`
		});
	}

	return response;
}

/**
 * Download and parse JSONL results from a bulk operation
 *
 * @param url - URL to download JSONL results from
 * @returns Array of parsed JSON objects
 */
export async function downloadBulkResults<T = any>(url: string): Promise<T[]> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: `Failed to download bulk results: ${response.statusText}`
		});
	}

	const text = await response.text();
	const lines = text.split('\n').filter((line) => line.trim());

	return lines.map((line) => JSON.parse(line) as T);
}

/**
 * Execute a complete bulk query workflow
 *
 * @param query - GraphQL query to execute
 * @param pollInterval - Polling interval in ms
 * @param onProgress - Progress callback
 * @returns Downloaded and parsed results
 */
export async function executeBulkQuery<T = any>(
	query: string,
	pollInterval: number = 500,
	onProgress?: (objectCount: string, elapsedSeconds: number) => void
): Promise<T[]> {
	// Create bulk query
	const operation = await createBulkQuery(query);
	console.log(`Bulk query created: ${operation.id}`);

	// Poll until complete
	const result = await pollBulkOperation('query', pollInterval, undefined, onProgress);

	// Check for errors
	if (result.status === 'FAILED') {
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: `Bulk query failed with error: ${result.errorCode}`
		});
	}

	if (result.status === 'CANCELED') {
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'Bulk query was canceled'
		});
	}

	// Download results
	if (!result.url) {
		console.log('Bulk query completed but returned no results');
		return [];
	}

	return downloadBulkResults<T>(result.url);
}

/**
 * Execute a complete bulk mutation workflow
 *
 * @param mutation - GraphQL mutation to execute
 * @param variables - Array of variable objects for each mutation execution
 * @param filename - Name for the uploaded file
 * @param pollInterval - Polling interval in ms
 * @param onProgress - Progress callback
 * @returns Downloaded and parsed results
 */
export async function executeBulkMutation<T = any>(
	mutation: string,
	variables: any[],
	filename: string = 'bulk_mutation_vars.jsonl',
	pollInterval: number = 500,
	onProgress?: (objectCount: string, elapsedSeconds: number) => void
): Promise<T[]> {
	// Create JSONL content
	const jsonlContent = variables.map((v) => JSON.stringify(v)).join('\n');

	// Create staged upload
	const stagedUpload = await createStagedUpload(filename);
	console.log('Staged upload created');

	// Upload JSONL file
	await uploadToStaged(stagedUpload.url, stagedUpload.parameters, jsonlContent);
	console.log('File uploaded to staged location');

	// Extract the staged path from parameters
	const keyParam = stagedUpload.parameters.find((p) => p.name === 'key');
	if (!keyParam) {
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'Failed to extract staged upload path'
		});
	}

	// Create bulk mutation
	const operation = await createBulkMutation(mutation, keyParam.value);
	console.log(`Bulk mutation created: ${operation.id}`);

	// Poll until complete
	const result = await pollBulkOperation('mutation', pollInterval, undefined, onProgress);

	// Check for errors
	if (result.status === 'FAILED') {
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: `Bulk mutation failed with error: ${result.errorCode}`
		});
	}

	if (result.status === 'CANCELED') {
		throw new TRPCError({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'Bulk mutation was canceled'
		});
	}

	// Download results
	if (!result.url) {
		console.log('Bulk mutation completed but returned no results');
		return [];
	}

	return downloadBulkResults<T>(result.url);
}
