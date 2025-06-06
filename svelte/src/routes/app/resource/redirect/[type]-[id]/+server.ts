import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals: { client } }) => {
	const res = await client.resources.getUniId.query({
		type: params.type as 'guildInventory', // Fake as any
		id: parseInt(params.id)
	});

	if (!res) error(404);

	redirect(302, `/app/resource/${res.uniId}${params.type === 'unifiedGuild' ? '/unified' : ''}`);
};
