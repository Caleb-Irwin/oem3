import { db } from '../../../db';
import { shopifyConnect } from '../connect';
import { SHOPIFY_LOCATION_ID_STORE, SHOPIFY_LOCATION_ID_WAREHOUSE } from '../../../env';
import type { InventoryBulkToggleActivationMutation } from '../../../../types/admin.generated';

export async function activateAllInventoryLocations() {
	const inventoryIds = (
		await db.query.shopify.findMany({
			columns: {
				vInventoryItemId: true
			}
		})
	)
		.map((item) => item.vInventoryItemId)
		.filter((id): id is string => !!id);

	console.log(`Activating inventory locations for ${inventoryIds.length} inventory items`);

	const { client } = shopifyConnect();

	let totalActivated = 0,
		totalErrors = 0,
		lastNotifyCount = 0;

	for (let i = 0; i < inventoryIds.length; i += 8) {
		const batch = inventoryIds.slice(i, i + 8);
		const start = Date.now();

		const res = await Promise.all(
			batch.map((id) =>
				client.request<InventoryBulkToggleActivationMutation>(mutation, {
					variables: {
						inventoryItemId: id,
						inventoryItemUpdates: [
							{
								locationId: SHOPIFY_LOCATION_ID_STORE,
								activate: true
							},
							{
								locationId: SHOPIFY_LOCATION_ID_WAREHOUSE,
								activate: true
							}
						]
					}
				})
			)
		);

		const activations = res.map((r) => r.data?.inventoryBulkToggleActivation);
		activations.forEach((activation, index) => {
			if (!activation) {
				console.error(`No activation data for inventory item ID: ${batch[index]}`);
				totalErrors++;
				return;
			}
			if (activation.userErrors.length > 0) {
				console.error(`Errors for inventory item ID: ${batch[index]}`, activation.userErrors);
				totalErrors++;
				return;
			}
			totalActivated++;
		});

		if (lastNotifyCount + 50 <= totalActivated + totalErrors) {
			console.log(
				`Processed ${totalActivated + totalErrors} items: ${totalActivated} activated, ${totalErrors} errors.`
			);
			lastNotifyCount = totalActivated + totalErrors;
		}

		const elapsed = Date.now() - start;
		if (elapsed < 1000 && i + 8 < inventoryIds.length) {
			await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
		}
	}

	console.log(
		`Activation complete: ${totalActivated} activated, ${totalErrors} errors out of ${inventoryIds.length} items.`
	);
}

const mutation = `#graphql
mutation inventoryBulkToggleActivation($inventoryItemId: ID!, $inventoryItemUpdates: [InventoryBulkToggleActivationInput!]!) {
    inventoryBulkToggleActivation(
        inventoryItemId: $inventoryItemId
        inventoryItemUpdates: $inventoryItemUpdates
    ) {
        inventoryItem {
        id
        }
        userErrors {
        field
        message
        code
        }
    }
}
`;
