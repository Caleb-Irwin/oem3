import { TRPCError } from '@trpc/server';
import { router } from '../../../trpc';
import { fileProcedures } from '../../../utils/files';
import { managedWorker } from '../../../utils/managedWorker';
import * as xlsx from 'xlsx';
import { ensureSheetCols } from '../../../utils/ensureSheetCols';

const { worker, runWorker, hook } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'guildData'
);
export const guildDataHook = hook;

export const guildDataRouter = router({
	files: fileProcedures(
		'guildData',
		async (dataUrl, fileType) => {
			if (fileType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
				throw new TRPCError({
					message: 'Invalid File Type (XLSX Only)',
					code: 'BAD_REQUEST'
				});

			ensureSheetCols(xlsx.read(dataUrl.slice(dataUrl.indexOf(';base64,') + 8)), [
				'Supplier  (Guild Vendor Name)',
				'Product Code (Guild Product #)',
				'UPC#',
				'SPR#',
				'Basics#',
				'CIS#',
				'ENglish Short Description',
				'FRench Short Description',
				'ENglish Long Description',
				'FRench Long Description',
				'ENglish Unit',
				'FRench Unit',
				'Freight Flag',
				'Shipping Weight',
				'Standard Pack Qty',
				'Master Pack Qty',
				'Retail Price Level',
				'Price Level 1',
				'Price Level 0',
				'Min. Qty Order',
				'Member Price',
				'Heavy Goods Chg_SK',
				'Dropship Price',
				'Date Changed',
				'Web Category',
				'Web Category 1 Descriptions',
				"Web Category 2 'Sub' Descriptions",
				"Web Category 3 'Sub-Sub' Descriptions",
				"Web Category 4 'Sub-Sub-Sub' Descriptions",
				'Image URL'
			]);
		},
		runWorker
	),
	worker
});
