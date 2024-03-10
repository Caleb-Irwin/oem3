import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { getClient } from '$lib/getClient.server';

export const actions = {
	default: async ({ request, fetch }) => {
		const data = await request.formData(),
			username = data.get('username'),
			password = data.get('password'),
			client = getClient(fetch),
			pass = await client.user.login.query({ username, password });
		if (pass) {
			return fail(400, { msg: 'Error: Something bad happened!' });
		}
		return redirect(302, '/app');
	}
} satisfies Actions;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
