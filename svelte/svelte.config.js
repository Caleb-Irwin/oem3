import adapter from '@sveltejs/adapter-node';

export default {
	vitePlugin: {
		inspector: true
	},
	kit: {
		adapter: adapter()
	}
};
