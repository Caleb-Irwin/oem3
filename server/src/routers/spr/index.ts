// SPR routers (existing)
import { router } from '../../trpc';
import { sprFlatFileHook, sprFlatFileRouter } from './flatFile';
import { enhancedContentHook, enhancedContentRouter } from './enhancedContent';
import { sprPriceFileHook, sprPriceFileRouter } from './priceFile';
import { managedWorker } from '../../utils/managedWorker';
import { updateUnifiedTopicByUniId } from '../unified.helpers';
import { updateByChangesetType } from '../resources';

const { worker, hook, runWorker } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'unifiedSpr',
	[sprPriceFileHook, sprFlatFileHook, enhancedContentHook],
	({ msg }) => (msg ? updateUnifiedTopicByUniId(msg) : null)
);

export const runSprWorker = runWorker;

hook(() => {
	updateByChangesetType('sprPriceFile');
	updateByChangesetType('sprFlatFile');
});

export const sprHook = hook;

export const sprRouter = router({
	worker,
	flatFile: sprFlatFileRouter,
	priceFile: sprPriceFileRouter,
	enhancedContent: enhancedContentRouter
});
