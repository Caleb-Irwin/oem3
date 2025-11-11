import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url: { searchParams } }) => {
	if (locals.user) {
		return redirect(302, '/app/');
	}
	return {
		redirectTo: searchParams.get('redirectTo') || '/app/'
	};
};
