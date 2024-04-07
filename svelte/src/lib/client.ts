import {
	createTRPCClient,
	createWSClient,
	httpBatchLink,
	splitLink,
	TRPCClientError,
	wsLink
} from '@trpc/client';
import { writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import type { AppRouter } from '../../../server/src';
import { getToastStore } from '@skeletonlabs/skeleton';

export const client = createTRPCClient<AppRouter>({
	links: [
		splitLink({
			condition(op) {
				return op.type !== 'subscription';
			},
			true: httpBatchLink({
				url: '/trpc'
			}),
			false: browser
				? wsLink({
						client: createWSClient({
							url: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/trpc`
						})
					})
				: httpBatchLink({
						url: '/trpc'
					})
		})
	]
});

export function isTRPCClientError(cause: unknown): cause is TRPCClientError<AppRouter> {
	return cause instanceof TRPCClientError;
}

export const query = <I, O>(
	q: { query: (input: I) => Promise<O> },
	...args: I extends void ? [] : [I]
): Readable<O | undefined> => {
	const { subscribe, set } = writable<O | undefined>(undefined);

	if (browser) q.query(args[0] as I).then((v) => set(v));
	return { subscribe };
};

export const sub = <I, O, SO>(
	q: { query: (input: I) => Promise<O> },
	{
		subscribe: sub
	}: {
		subscribe: (
			param: void,
			opts: {
				onData?: (data: SO) => void;
				onError?: (err: TRPCClientError<any>) => void;
			}
		) => any;
	},
	...args: I extends void ? [] : [I]
): Readable<O | undefined> => {
	const { subscribe, set } = writable<O | undefined>(undefined);

	if (browser) {
		q.query(args[0] as I).then((v) => set(v));
		sub(undefined, {
			onData(data) {
				q.query(args[0] as I).then((v) => set(v));
			},
			onError(e) {
				getToastStore().trigger({
					message: isTRPCClientError(e)
						? e.message[0] === '['
							? JSON.parse(e.message)[0].message
							: e.message
						: 'Error Occured',
					background: 'variant-filled-error'
				});
				if (!isTRPCClientError(e)) {
					console.log(e);
				}
			}
		});
	}

	return { subscribe };
};
