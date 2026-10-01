import { adminProcedure, router } from '../../../trpc';
import { managedWorker } from '../../../utils/managedWorker';
import { activateAllInventoryLocations } from './activateInventoryLocations';
import { db } from '../../../db';
import { shopifyMetadata } from './shopifyMetadata.table';
import { and, eq, gt } from 'drizzle-orm';
// import { productHook } from '../../product';

const { worker, hook } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'shopifyPush',
	[/*productHook TODO*/],
	undefined,
	1
);

export const shopifyPushHook = hook;

export const shopifyPushRouter = router({
	worker,
	resetFailedUploads: adminProcedure.mutation(async () => {
		// Failing products are retried once they change; this retries all of them on the next push
		await db
			.update(shopifyMetadata)
			.set({ failureCount: 0 })
			.where(and(eq(shopifyMetadata.status, 'FAILED'), gt(shopifyMetadata.failureCount, 0)));
	}),
	activateAllInventoryLocations: adminProcedure.mutation(async () => {
		activateAllInventoryLocations();
	})
});
