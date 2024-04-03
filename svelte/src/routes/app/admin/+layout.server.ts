import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, parent }) => {
	await parent();
	if (locals.user?.permissionLevel !== 'admin') return redirect(302, '/app/');
};
