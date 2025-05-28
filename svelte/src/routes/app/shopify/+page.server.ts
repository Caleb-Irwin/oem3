
import { promiseAllObject } from '$lib/promiseAllObject';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { client } }) => {
    return await promiseAllObject({
        status: client.shopify.worker.status.query(),
        changeset: client.shopify.worker.changeset.query(),
        files: client.shopify.files.get.query(),
    })
};