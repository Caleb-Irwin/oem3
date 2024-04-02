import jwt from 'jsonwebtoken';
import { getClient } from '$lib/client';
import type { Handle } from '@sveltejs/kit';
import type { jwtFields } from '../../server/src/routers/user';
import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('jwt') ?? '';
	try {
		event.locals.user = token === '' ? null : (jwt.verify(token, env.JWT_SECRET) as jwtFields);
	} catch (e) {
		event.locals.user = null;
	}
	event.locals.client = getClient(token);
	return await resolve(event);
};
