import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../server/src/index';
import { env } from '$env/dynamic/private';

export const getServerClient = (authJWT: string) =>
	createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: `http://localhost:${env.PORT ?? '3000'}/trpc`,
				headers: {
					authorization: authJWT
				}
			})
		]
	});
