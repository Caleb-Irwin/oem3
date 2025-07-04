import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals: { client } }) => {
	const res = await client.resources.get.query({
		uniId: parseInt(params.uniId),
		includeHistory: false
	});
	if (!res) throw error(404, 'Resource not found');

	const unifiedRes = await client.unified.get.query({
		uniId: parseInt(params.uniId)
	});
	if (!unifiedRes) throw error(404, 'This is not a unified resource');

	return unifiedRes;
};
