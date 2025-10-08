import { router } from '../../trpc';
import { guildInventoryHook, inventoryRouter } from './inventory';
import { flyerRouter, guildFlyerHook } from './flyer';
import { descRouter, guildDescHook } from './desc';
import { guildDataHook, guildDataRouter } from './data';
import { managedWorker } from '../../utils/managedWorker';
import { updateUnifiedTopicByUniId } from '../unified.helpers';
import { updateByTableName } from '../resources';

const { worker, hook, runWorker } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'unifiedGuild',
	[guildDataHook, guildFlyerHook, guildInventoryHook, guildDescHook],
	({ msg }) => (msg ? updateUnifiedTopicByUniId(msg) : null),
	1
);

export const runGuildWorker = runWorker;

hook(() => {
	updateByTableName('guildData');
	updateByTableName('guildInventory');
	updateByTableName('guildFlyer');
});

export const guildHook = hook;

export const guildRouter = router({
	worker,
	inventory: inventoryRouter,
	flyer: flyerRouter,
	desc: descRouter,
	data: guildDataRouter
});
