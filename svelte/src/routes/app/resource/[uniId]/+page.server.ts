import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { client } }) => {
	const res = await client.resources.get.query({
		uniId: parseInt(params.uniId),
		includeHistory: true
	});

	return {
		res
	};
};
