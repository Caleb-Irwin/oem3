import { router } from '../../trpc';
import { guildInventoryHook, inventoryRouter } from './inventory';
import { flyerRouter, guildFlyerHook } from './flyer';
import { descRouter, guildDescHook } from './desc';
import { guildDataHook, guildDataRouter } from './data';
import { managedWorker } from '../../utils/managedWorker';
import { updateUnifiedTopicByUniId } from '../unified.helpers';
import { updateByChangesetType } from '../resources';

const { worker, hook, triggerHooks } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'unifiedGuild',
	[guildDataHook, guildFlyerHook, guildInventoryHook, guildDescHook],
	({ msg }) => (msg ? updateUnifiedTopicByUniId(msg) : null)
);

hook(() => {
	updateByChangesetType('guildData');
	updateByChangesetType('guildInventory');
	updateByChangesetType('guildFlyer');
});

export const guildHook = hook;
export const guildTriggerHooks = triggerHooks;

export const guildRouter = router({
	worker,
	inventory: inventoryRouter,
	flyer: flyerRouter,
	desc: descRouter,
	data: guildDataRouter
});
