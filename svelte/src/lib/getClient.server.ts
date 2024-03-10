import { createTRPCClient, httpBatchLink } from '@trpc/client';

import type { AppRouter } from '../../../server/src/index';

export const getClient = (customFetch: typeof fetch) =>
	createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: 'http://server/trpc',
				fetch: customFetch
			})
		]
	});
