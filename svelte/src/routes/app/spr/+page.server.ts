import { promiseAllObject } from '$lib/promiseAllObject';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { client } }) => {
    return await promiseAllObject({
        // SPR Price File
        sprPriceFileStatus: client.spr.priceFile.worker.status.query(),
        sprPriceFileChangeset: client.spr.priceFile.worker.changeset.query(),
        sprPriceFileFiles: client.spr.priceFile.files.get.query(),

        // SPR Flat File
        sprFlatFileStatus: client.spr.flatFile.worker.status.query(),
        sprFlatFileChangeset: client.spr.flatFile.worker.changeset.query(),
        sprFlatFileFiles: client.spr.flatFile.files.get.query(),

        // SPR Enhanced Content Worker
        sprEnhancedContentStatus: client.spr.enhancedContent.worker.status.query(),
    });
};
