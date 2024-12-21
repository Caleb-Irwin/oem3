// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
import type { ServerClient } from '$lib/client.server';
import type { jwtFields } from '../../server/src/routers/user';

declare global {
	namespace App {
		interface Locals {
			client: ServerClient;
			user: jwtFields | null;
		}

		// interface PageData {}
		// interface Error {}
		// interface Platform {}
	}
}
