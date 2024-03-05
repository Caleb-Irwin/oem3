import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	console.log(event.request.headers.get('origin'));

	const response = await resolve(event);
	return response;
};
