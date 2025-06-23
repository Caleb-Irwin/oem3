import { router } from '../../../trpc';
import { managedWorker } from '../../../utils/managedWorker';
import { sprFlatFileHook } from '../flatFile';

const { worker, hook } = managedWorker(new URL('worker.ts', import.meta.url).href, 'sprImages', [
	sprFlatFileHook
]);

export const enhancedContentHook = hook;

export const enhancedContentRouter = router({
	worker
});
