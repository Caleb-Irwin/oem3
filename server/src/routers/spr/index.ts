// SPR routers (existing)
import { router } from '../../trpc';
import { sprFlatFileHook, sprFlatFileRouter } from './flatFile';
import { enhancedContentHook, enhancedContentRouter } from './enhancedContent';
import { sprPriceFileHook, sprPriceFileRouter } from './priceFile';
import { managedWorker } from '../../utils/managedWorker';
import { updateUnifiedTopicByUniId } from '../unified.helpers';
import { updateByTableName } from '../resources';

const { worker, hook, runWorker } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'unifiedSpr',
	[sprPriceFileHook, sprFlatFileHook, enhancedContentHook],
	({ msg }) => (msg ? updateUnifiedTopicByUniId(msg) : null),
	1
);

export const runSprWorker = runWorker;

hook(() => {
	updateByTableName('sprPriceFile');
	updateByTableName('sprFlatFile');
});

export const sprHook = hook;

export const sprRouter = router({
	worker,
	flatFile: sprFlatFileRouter,
	priceFile: sprPriceFileRouter,
	enhancedContent: enhancedContentRouter
});
