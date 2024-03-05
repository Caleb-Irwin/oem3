import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('username');
		const password = data.get('password');
		console.log(email, password);
		if (Math.random() > 0.5) {
			return fail(400, { msg: 'Error: Something bad happened!' });
		}
		return redirect(302, '/app');
	}
} satisfies Actions;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
