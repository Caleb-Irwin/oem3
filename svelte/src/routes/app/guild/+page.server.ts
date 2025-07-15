import { promiseAllObject } from '$lib/promiseAllObject';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { client } }) => {
	return await promiseAllObject({
		// Guild Data
		guildDataStatus: client.guild.data.worker.status.query(),
		guildDataChangeset: client.guild.data.worker.changeset.query(),
		guildDataFiles: client.guild.data.files.get.query(),

		// Guild Inventory
		guildInventoryStatus: client.guild.inventory.worker.status.query(),
		guildInventoryChangeset: client.guild.inventory.worker.changeset.query(),
		guildInventoryFiles: client.guild.inventory.files.get.query(),

		// Guild Flyer
		guildFlyerStatus: client.guild.flyer.worker.status.query(),
		guildFlyerChangeset: client.guild.flyer.worker.changeset.query(),
		guildFlyerFiles: client.guild.flyer.files.get.query(),

		// Guild Description Worker
		guildDescStatus: client.guild.desc.worker.status.query(),

		// Guild Worker
		guildWorkerStatus: client.guild.worker.status.query(),

		// Guild Error Summary
		guildErrorSummary: client.summaries.get.query({ type: 'unifiedGuild' })
	});
};
