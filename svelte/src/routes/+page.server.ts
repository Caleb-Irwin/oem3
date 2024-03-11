import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isTRPCClientError } from '$lib/client';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		return redirect(302, '/app/');
	}
	return;
};

export const actions = {
	login: async ({ request, cookies, locals: { client } }) => {
		const data = await request.formData(),
			username = data.get('username'),
			password = data.get('password');

		try {
			cookies.set('jwt', (await client.user.login.mutate({ username, password })).token, {
				path: '/'
			});
		} catch (cause) {
			if (isTRPCClientError(cause)) {
				return fail(400, {
					msg: cause.message ?? JSON.parse(cause.message)[0].message
				});
			} else {
				return fail(400, { msg: 'Something bad happened. Try again' });
			}
		}
		return redirect(302, '/app');
	},
	logout: async ({ cookies, locals: { client } }) => {
		await client.user.logout.mutate();
		cookies.delete('jwt', { path: '/' });
		return redirect(302, '/');
	}
} satisfies Actions;
