import { genDiffer } from '../../../utils/changeset.helpers';
import { work } from '../../../utils/workerBase';
import { guildFlyer } from './table';
import { applyActivation, importFlyer, parseFlyerFile, resolveFlyerItems } from './resolve';

work({
	process: async ({ db, message, progress, utils: { getFileDataUrl, createChangeset } }) => {
		const fileId = (message as { fileId?: number }).fileId,
			changeset = await createChangeset(guildFlyer, fileId);

		const rawFlyers =
			fileId === undefined ? [] : parseFlyerFile(await getFileDataUrl(fileId), fileId);

		await db.transaction(async (db) => {
			for (const raw of rawFlyers) await importFlyer(db, raw);

			progress(0.25);

			const sets = await applyActivation(db);
			const resolved = await resolveFlyerItems(db, sets);

			const prevItems = new Map(
				(await db.query.guildFlyer.findMany({ with: { uniref: true } })).map((item) => [
					item.gid,
					item
				])
			);
			await changeset.process({
				db,
				rawItems: resolved,
				prevItems,
				transform: (item) => item,
				extractId: (item) => item.gid,
				diff: genDiffer(
					[],
					[
						'gid',
						'set',
						'flyerNumber',
						'startDate',
						'endDate',
						'vendorCode',
						'flyerCostCents',
						'flyerPriceL0Cents',
						'flyerPriceL1Cents',
						'flyerPriceRetailCents',
						'regularPriceL0Cents',
						'regularPriceL1Cents'
					]
				),
				progress: (amountDone) => progress(0.25 + amountDone * 0.75),
				fileId
			});
		});
	}
});
