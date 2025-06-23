import { promiseAllObject } from '$lib/promiseAllObject';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { client } }) => {
	return await promiseAllObject({
		status: client.qb.worker.status.query(),
		changeset: client.qb.worker.changeset.query(),
		files: client.qb.files.get.query()
	});
};
