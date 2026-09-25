import { router } from '../../trpc';
import { flyerRouter, guildFlyerHook } from './flyer';
import { descRouter, guildDescHook } from './desc';
import { guildDataHook, guildDataRouter } from './data';
import { managedWorker } from '../../utils/managedWorker';
import { updateUnifiedTopicByUniId } from '../unified.helpers';
import { updateByTableName } from '../resources';

const { worker, hook, runWorker } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'unifiedGuild',
	[guildDataHook, guildFlyerHook, guildDescHook],
	({ msg }) => (msg ? updateUnifiedTopicByUniId(msg) : null),
	1
);

export const runGuildWorker = runWorker;

hook(() => {
	updateByTableName('guildData');
	updateByTableName('guildFlyer');
});

export const guildHook = hook;

export const guildRouter = router({
	worker,
	flyer: flyerRouter,
	desc: descRouter,
	data: guildDataRouter
});
