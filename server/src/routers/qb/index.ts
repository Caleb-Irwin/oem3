import { TRPCError } from '@trpc/server';
import { router } from '../../trpc';
import { fileProcedures } from '../../utils/files';
import { managedWorker } from '../../utils/managedWorker';

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
	worker
});
