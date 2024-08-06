import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const res = await locals.client.resources.getGuildThumb.query({
		gid: params.gid
	});
	return new Response(
		new Blob([new Uint8Array(res.data).buffer as BufferSource], { type: 'image/jpeg' }),
		{
			headers: { 'Cache-Control': 'public, max-age=86400' }
		}
	);
};
