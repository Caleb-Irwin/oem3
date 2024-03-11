import { jwtDecode } from 'jwt-decode';
import { getClient } from '$lib/client';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('jwt') ?? '';
	event.locals.client = getClient(token);
	event.locals.user = token === '' ? null : jwtDecode(token);
	return await resolve(event);
};
