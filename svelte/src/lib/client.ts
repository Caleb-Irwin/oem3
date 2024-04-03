import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from '../../../server/src/index';
import { writable, type Readable } from 'svelte/store';
import { browser } from '$app/environment';

export const client = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: '/trpc'
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
