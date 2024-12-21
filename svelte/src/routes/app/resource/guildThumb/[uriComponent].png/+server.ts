import type { RequestHandler } from './$types';
import sharp from 'sharp';

export const GET: RequestHandler = async ({ fetch, params }) => {
	const res = await fetch(
		`https://img.shopofficeonline.com/venxia/${decodeURIComponent(params.uriComponent)}.png`
	);
	const resBuffer = await res.arrayBuffer();
	const pngBuffer = await sharp(resBuffer)
		.resize(256, 256)
		.toFormat('png', { quality: 80 })
		.toBuffer();

	return new Response(new Blob([pngBuffer], { type: 'image/png' }), {
		headers: { 'Cache-Control': 'public, max-age=86400' }
	});
};
