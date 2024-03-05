import adapter from 'svelte-adapter-bun';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte'],
	preprocess: [vitePreprocess()],

	vitePlugin: {
		inspector: true
	},
	kit: {
		adapter: adapter(),
		csrf: false
	}
};
export default config;
