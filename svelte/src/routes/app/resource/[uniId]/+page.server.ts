import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { client } }) => {
	const res = await client.resources.get.query({
		uniId: parseInt(params.uniId),
		includeHistory: true
	});

	if (res.unifiedGuildData) throw redirect(308, `/app/resource/${params.uniId}/unified`);

	return {
		res
	};
};
