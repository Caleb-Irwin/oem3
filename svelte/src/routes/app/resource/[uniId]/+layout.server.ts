import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, params, locals: { client } }) => {
	const unmatchedMode = url.searchParams.get('unmatchedMode') === 'true';
	const { uniId } = params;

	const res = await client.resources.get.query({
		uniId: parseInt(params.uniId),
		includeHistory: true,
		includeAllowUnmatched: true
	});

	return {
		unmatchedMode,
		uniId: parseInt(uniId),
		res
	};
};
