import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	console.log(event.request.headers.get('origin'));

	const protocol = event.request.headers.get('x-forwarded-proto') || 'https';
	const host = event.request.headers.get('host');

	console.log(`combined ${protocol}://${host}`);

	const response = await resolve(event);
	return response;
};
