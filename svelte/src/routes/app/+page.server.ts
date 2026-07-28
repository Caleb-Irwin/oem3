import { promiseAllObject } from '$lib/promiseAllObject';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { client } }) => {
	return await promiseAllObject({
		// Item counts and outstanding errors per unified table
		productSummary: client.summaries.get.query({ type: 'unifiedProduct' }),
		guildSummary: client.summaries.get.query({ type: 'unifiedGuild' }),
		sprSummary: client.summaries.get.query({ type: 'unifiedSpr' }),

		// Initial state of every worker behind a tile, kept live by subscriptions on the page
		productWorker: client.product.worker.status.query(),

		guildWorker: client.guild.worker.status.query(),
		guildDataWorker: client.guild.data.worker.status.query(),
		guildInventoryWorker: client.guild.inventory.worker.status.query(),
		guildFlyerWorker: client.guild.flyer.worker.status.query(),
		guildDescWorker: client.guild.desc.worker.status.query(),

		sprWorker: client.spr.worker.status.query(),
		sprPriceFileWorker: client.spr.priceFile.worker.status.query(),
		sprFlatFileWorker: client.spr.flatFile.worker.status.query(),
		sprEnhancedContentWorker: client.spr.enhancedContent.worker.status.query(),

		qbWorker: client.qb.worker.status.query(),

		shopifyWorker: client.shopify.worker.status.query(),
		shopifyPushWorker: client.shopify.pushSync.worker.status.query()
	});
};
