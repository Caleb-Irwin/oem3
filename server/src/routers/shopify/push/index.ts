import { adminProcedure, router } from '../../../trpc';
import { managedWorker } from '../../../utils/managedWorker';
import { activateAllInventoryLocations } from './activateInventoryLocations';
import { archiveUnmatchedProducts } from './archiveUnmatched';
// import { productHook } from '../../product';

const { worker } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'shopify',
	[
		/*productHook TODO*/
	],
	undefined,
	1
);

export const shopifyPushRouter = router({
	worker,
	archiveAllUnmatchedProducts: adminProcedure.mutation(async () => {
		await archiveUnmatchedProducts();
	}),
	activateAllInventoryLocations: adminProcedure.mutation(async () => {
		activateAllInventoryLocations();
	})
});
