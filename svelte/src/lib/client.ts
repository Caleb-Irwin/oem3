import { createTRPCClient, httpBatchLink } from '@trpc/client';

import type { AppRouter } from '../../../server/src/index';

export const client = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: '/trpc'
		})
	]
});
