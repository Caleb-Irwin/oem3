import { PORT, DEV } from './config';

export async function genKit() {
	if (DEV) return devKit();
	process.env['ORIGIN'] = process.env['RAILWAY_PUBLIC_DOMAIN']
		? `https://${process.env['RAILWAY_PUBLIC_DOMAIN']}`
		: `http://localhost:${PORT}`;
	// Non-literal specifier so TS doesn't resolve (and type-check) the build output
	const handlerPath = '../../svelte/build/handler';
	return (await import(handlerPath)).handler;
}

async function devKit() {
	const { createProxyMiddleware } = await import('http-proxy-middleware');
	return createProxyMiddleware({
		target: 'http://localhost:5173',
		logLevel: 'silent'
	});
}

export const kit = await genKit();
