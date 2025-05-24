<script lang="ts">
	import type { HTMLImgAttributes } from 'svelte/elements';

	interface Props extends HTMLImgAttributes {
		src: string;
		thumbnail?: boolean;
	}

	let { src, thumbnail, ...rest }: Props = $props();

	let url = $derived.by(() => {
		if (src.startsWith('https://content.etilize.com/')) {
			return thumbnail ? src : src; // TODO Add thumbnail support for Etilize
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
	});
</script>

<img {...rest} src={url} />
