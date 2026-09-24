import { TRPCError } from '@trpc/server';
import { router } from '../../../trpc';
import { fileProcedures } from '../../../utils/files';
import { managedWorker } from '../../../utils/managedWorker';
import * as xlsx from 'xlsx';
import { ensureSheetCols } from '../../../utils/ensureSheetCols';

const { worker, hook, runWorker } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'sprPriceFile'
);

export const sprPriceFileHook = hook;

export const sprPriceFileRouter = router({
	worker,
	files: fileProcedures(
		'priceFile',
		async (dataUrl, fileType) => {
			if (fileType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
				throw new TRPCError({
					message: 'Invalid File Type (XLSX Only)',
					code: 'BAD_REQUEST'
				});

			ensureSheetCols(xlsx.read(dataUrl.slice(dataUrl.indexOf(';base64,') + 8)), [
				'Novexco Product Code',
				'Product Category Description',
				'Number of units per pack or box',
				'Catalogue Page',
				'SPR Product Code',
				'GUILD Product Code',
				'French Short Description',
				'English Short Description',
				'Supplier name',
				'Supplier Product Code Number',
				'English Unit of Measure',
				'Direct Cost',
				'Retail Price',
				'Unit Cost',
				'Warehousing Purchasing Status',
				'Direct Purchasing Status',
				'UPC 1 - Unit Pack',
				'Net Price',
				'Laval Inventory',
				'Calgary Inventory',
				'Halifax Inventory',
				'Surrey Inventory',
				'Brampton Inventory',
				'CWS Number'
			]);
		},
		runWorker
	)
});
