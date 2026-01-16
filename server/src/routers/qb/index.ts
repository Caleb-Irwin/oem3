import { TRPCError } from '@trpc/server';
import { router, viewerProcedure } from '../../trpc';
import { fileProcedures } from '../../utils/files';
import { managedWorker } from '../../utils/managedWorker';
import { z } from 'zod';
import { db } from '../../db';
import { eq, isNull } from 'drizzle-orm';
import { qb } from './table';
import { unifiedProduct } from '../product/table';
import { unifiedGuild } from '../guild/table';
import { guildFlyer } from '../guild/flyer/table';

const { worker, runWorker, hook } = managedWorker(new URL('worker.ts', import.meta.url).href, 'qb');
export const qbHook = hook;

export const qbRouter = router({
	files: fileProcedures(
		'qb',
		async (fileDataUrl, fileType) => {
			if (fileType !== 'text/csv')
				throw new TRPCError({
					message: 'Invalid File Type (CSV Only)',
					code: 'BAD_REQUEST'
				});

			const csvStart = atob(fileDataUrl.slice(fileDataUrl.indexOf(';base64,') + 8)).slice(0, 1000),
				headers = csvStart.split('\n')[0].replaceAll(/"/g, '').split(',');

			[
				'Item',
				'Description',
				'Type',
				'Cost',
				'Price',
				'Sales Tax Code',
				'Purchase Tax Code',
				'Account',
				'Quantity On Hand',
				'Quantity On Sales Order',
				'Quantity On Purchase Order',
				'U/M Set',
				'U/M'
			].forEach((key) => {
				if (!headers.includes(key))
					throw new TRPCError({
						message: 'Missing Column: ' + key,
						code: 'BAD_REQUEST'
					});
			});
		},
		runWorker
	),
	worker,
	priceChanges: viewerProcedure
		.input(
			z.object({
				maxIncreasePercent: z.coerce.number().default(100),
				maxDecreasePercent: z.coerce.number().default(100)
			})
		)
		.query(async ({ input: { maxIncreasePercent, maxDecreasePercent } }) => {
			const results = await db
				.select({
					barcode: qb.upc,
					productName: qb.productName,
					price: unifiedGuild.priceCents,
					oldPrice: qb.priceCents,
					description: qb.desc,
					inventory: qb.quantityOnHand,
					qbName: qb.qbId,
					qbAccount: qb.account,
					flyerPriceL1Cents: guildFlyer.flyerPriceL1Cents
				})
				.from(qb)
				.innerJoin(unifiedProduct, eq(qb.id, unifiedProduct.qbRow))
				.innerJoin(unifiedGuild, eq(unifiedProduct.unifiedGuildRow, unifiedGuild.id))
				.leftJoin(guildFlyer, eq(unifiedGuild.flyerRow, guildFlyer.id))
				.where(isNull(guildFlyer.flyerPriceL1Cents));

			const filtered = results
				.filter((row) => row.price !== null && row.oldPrice !== null && row.price !== row.oldPrice)
				.map((row) => {
					const price = row.price!;
					const oldPrice = row.oldPrice!;
					const percentChange =
						oldPrice !== 0 ? ((price - oldPrice) / oldPrice) * 100 : price > 0 ? 100 : -100;
					// Fallback barcode to productName if upc is null or empty
					const barcode = row.barcode && row.barcode.trim() !== '' ? row.barcode : row.productName;

					return {
						...row,
						barcode,
						percentChange,
						price: price / 100,
						oldPrice: oldPrice / 100
					};
				})
				.filter((row) => {
					// Filter out items without a barcode
					if (!row.barcode || row.barcode.trim() === '') return false;
					if (row.percentChange > 0) return row.percentChange <= maxIncreasePercent;
					return Math.abs(row.percentChange) <= maxDecreasePercent;
				})
				.sort((a, b) =>
					(a.barcode ?? '').localeCompare(b.barcode ?? '', undefined, { numeric: true })
				);

			const data = filtered.map((row) => ({
				barcode: row.barcode!,
				price: row.price,
				oldPrice: row.oldPrice,
				description: row.description ?? '',
				inventory: row.inventory ?? '',
				qbName: row.qbName ?? '',
				qbAccount: row.qbAccount ?? ''
			}));

			return {
				summary: {
					total: results.length,
					filtered: filtered.length,
					maxIncreasePercent,
					maxDecreasePercent
				},
				data
			};
		})
});
