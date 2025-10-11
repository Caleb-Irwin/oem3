import { redirect } from '@sveltejs/kit';
import type { QueryType } from '../../../../../server/src/routers/search';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals: { client } }) => {
	const query = url.searchParams.get('query'),
		type = url.searchParams.get('type') as QueryType,
		qbMode = url.searchParams.get('qbMode') === 'on' ? true : false,
		searchInResults = url.searchParams.get('searchInResults') == 'on' ? true : false;

	let res: ReturnType<typeof client.search.search.query> | undefined = undefined;
	if (query) {
		if (
			!(
				[
					'all',
					'all',
					'qb',
					'guildData',
					'guildInventory',
					'guildFlyer',
					'shopify',
					'sprPriceFile',
					'sprFlatFile',
					'unifiedGuild',
					'unifiedSpr',
					'unifiedProduct'
				] satisfies QueryType[]
			).includes(url.searchParams.get('type') as QueryType)
		) {
			return redirect(
				307,
				`/app/search?query=${query}&type=all${qbMode ? '&qbMode=on' : ''}${searchInResults ? '&searchInResults=on' : ''}`
			);
		}
		res = client.search.search.query({
			query,
			type
		});
	}

	return {
		query: query ?? '',
		queryType: type ?? 'all',
		qbMode,
		searchInResults,
		res,
		queryString: url.search
	};
};
