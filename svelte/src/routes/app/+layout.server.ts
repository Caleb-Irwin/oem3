import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url: { pathname } }) => {
	if (!locals.user) return redirect(302, `/?redirectTo=${encodeURIComponent(pathname)}`);
	return {
		user: locals.user
	};
};
