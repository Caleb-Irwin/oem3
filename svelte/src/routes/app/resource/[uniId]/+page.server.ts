import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { res } = await parent();
	if (res.unifiedGuildData || res.unifiedSprData || res.unifiedProductData)
		throw redirect(308, `/app/resource/${params.uniId}/unified`);
	return {};
};
