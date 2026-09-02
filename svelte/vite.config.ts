import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		// #page is Skeleton's own AppShell id, so it appears in no source file for
		// PurgeCSS to match against; without this the scrollbar rule in app.postcss
		// would survive dev but be stripped from production builds.
		purgeCss({ safelist: { standard: ['page'] } })
	],
	server: {
		hmr: {
			clientPort: 5173
		}
	}
});
