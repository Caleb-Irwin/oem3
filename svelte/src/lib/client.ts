import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from '../../../server/src/index';
import { browser } from '$app/environment';

export const getClient = (authJWT: string) =>
	createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: browser ? '' : `http://localhost:${process.env['PORT'] ?? '3000'}` + '/trpc',
				headers: {
					authorization: authJWT
				}
			})
		]
	});

export function isTRPCClientError(cause: unknown): cause is TRPCClientError<AppRouter> {
	return cause instanceof TRPCClientError;
}
