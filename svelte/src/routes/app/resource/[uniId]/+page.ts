import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	return {
		uniId: params.uniId
	};
};
