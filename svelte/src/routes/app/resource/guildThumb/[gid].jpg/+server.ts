import type { RequestHandler } from './$types';
import sharp from 'sharp';

export const GET: RequestHandler = async ({ fetch, params }) => {
	const res = await fetch(`https://shopofficeonline.com/ProductImages/${params.gid}.jpg`);
	const resBuffer = await res.arrayBuffer();
	const jpgBuffer = await sharp(resBuffer)
		.resize(256, 256)
		.toFormat('jpeg', { quality: 80 })
		.toBuffer();

	return new Response(new Blob([jpgBuffer], { type: 'image/jpeg' }), {
		headers: { 'Cache-Control': 'public, max-age=86400' }
	});
};
