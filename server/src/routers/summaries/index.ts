import { z } from 'zod';
import { router, viewerProcedure } from '../../trpc';
import { eventSubscription } from '../../utils/eventSubscription';
import { managedWorker } from '../../utils/managedWorker';
import { guildHook } from '../guild';
import { db } from '../../db';
import { summaries, type SummaryTypeEnum } from './table';
import { eq } from 'drizzle-orm';

const { worker, hook } = managedWorker(new URL('worker.ts', import.meta.url).href, 'summaries', [
	guildHook
]);

const { createSub, update } = eventSubscription();

export const summariesHook = hook;

summariesHook(() => update());

async function getSummaryByType(type: 'all' | 'unifiedGuild') {
	const summary = await db.query.summaries.findFirst({
		where: eq(summaries.type, type)
	});

	if (!summary) {
		return null;
	}

	return {
		id: summary.id,
		type: summary.type,
		data: JSON.parse(summary.data ?? 'null') ?? null
	};
}

export interface SummaryType {
	id: number;
	type: SummaryTypeEnum;
	data?: any;
}

export const summariesRouter = router({
	worker,
	get: viewerProcedure
		.input(
			z.object({
				type: z.enum(['all', 'unifiedGuild'])
			})
		)
		.query(async ({ input: { type } }) => {
			return await getSummaryByType(type);
		}),
	getSub: createSub<
		{ type: 'all' | 'unifiedGuild' },
		{ id: number; type: 'all' | 'unifiedGuild'; data: any } | null
	>(async ({ input: { type } }) => {
		return await getSummaryByType(type);
	})
});
