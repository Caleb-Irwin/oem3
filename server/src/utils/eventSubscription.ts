import { z } from 'zod';
import { viewerProcedure } from '../trpc';
import EventEmitter, { on } from 'events';
import type { jwtFields } from '../routers/user';

export const eventSubscription = () => {
	const ee = new EventEmitter();
	ee.setMaxListeners(100);
	const update = (updateTopic = 'default') => {
		ee.emit(updateTopic);
	};

	function createSub<I, O>(func: SubFunc<I, O>) {
		return viewerProcedure
			.input(
				z.object({
					updateTopic: z.string().default('default'),
					sendInit: z.boolean().default(false),
					input: z.any()
				})
			)
			.subscription(async function* (opts) {
				if (opts.input.sendInit) {
					const initialResult = await func({ ctx: opts.ctx, input: opts.input.input });
					if (initialResult !== undefined) {
						yield initialResult;
					}
				}
				for await (const _ of on(ee, opts.input.updateTopic, {
					// Passing the AbortSignal from the request automatically cancels the event emitter when the subscription is aborted
					signal: opts.signal
				})) {
					const result = await func({ ctx: opts.ctx, input: opts.input.input });
					if (result !== undefined) {
						yield result;
					}
				}
			});
	}

	return {
		update,
		createSub
	};
};

type SubFunc<I, O> = (i: { ctx: { user: jwtFields }; input: I }) => Promise<O | undefined>;
