import { router } from '../../trpc';
import { managedWorker } from '../../utils/managedWorker';
import { updateUnifiedTopicByUniId } from '../unified.helpers';
import { updateByTableName } from '../resources';
import { guildHook } from '../guild';
import { qbHook } from '../qb';
import { shopifyHook } from '../shopify';
import { sprHook } from '../spr';

const { worker, hook, runWorker } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'unifiedProduct',
	[guildHook, sprHook, qbHook, shopifyHook],
	({ msg }) => (msg ? updateUnifiedTopicByUniId(msg) : null),
	1
);

export const runProductWorker = runWorker;

hook(() => {
	updateByTableName('guildData');
	updateByTableName('guildInventory');
	updateByTableName('guildFlyer');
	updateByTableName('sprPriceFile');
	updateByTableName('sprFlatFile');
	updateByTableName('qb');
	updateByTableName('shopify');
	updateByTableName('unifiedGuild');
	updateByTableName('unifiedSpr');
});

export const productHook = hook;

export const productRouter = router({
	worker
});
