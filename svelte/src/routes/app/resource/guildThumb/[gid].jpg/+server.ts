import type { RequestHandler } from './$types';
import Jimp from 'jimp';

export const GET: RequestHandler = async ({ fetch, params }) => {
	const res = await fetch(`https://shopofficeonline.com/ProductImages/${params.gid}.jpg`);
	const resBuffer = await res.arrayBuffer();
	const jpg = await Jimp.read(Buffer.from(resBuffer));
	jpg.resize(160, Jimp.AUTO);
	jpg.quality(80);
	return new Response(new Blob([await jpg.getBufferAsync('image/jpeg')], { type: 'image/jpeg' }), {
		headers: { 'Cache-Control': 'public, max-age=86400' }
	});
};
