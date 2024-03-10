import type { Handle, HandleFetch } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	return response;
};

export const handleFetch: HandleFetch = async ({ request, fetch }) => {
	if (request.url.startsWith('http://server/')) {
		request = new Request(request.url.replace('http://server/', 'http://localhost:3000/'), request);
	}

	return fetch(request);
};
