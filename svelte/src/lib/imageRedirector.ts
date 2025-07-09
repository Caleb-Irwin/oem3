export function imageRedirect(src: string, thumbnail = false) {
	if (src.startsWith('https://content.etilize.com/')) {
		return thumbnail ? src : src;
	}
	if (src.startsWith('https://cdn.shopify.com/')) {
		return !thumbnail ? src : src.includes('?') ? src + '&width=256' : src + '?width=256';
	}
	if (
		src.startsWith('https://shopofficeonline.com/ProductImages/') ||
		src.startsWith('https://img.shopofficeonline.com/venxia')
	) {
		return `/app/resource/img/${encodeURIComponent(src)}${thumbnail ? '?thumbnail' : ''}`;
	}
	return src;
}
