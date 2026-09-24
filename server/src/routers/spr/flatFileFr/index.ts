import { TRPCError } from '@trpc/server';
import { router } from '../../../trpc';
import { fileProcedures } from '../../../utils/files';
import { managedWorker } from '../../../utils/managedWorker';
import { downloadSprFlatFile } from '../flatFile/download';

const { worker, hook, runWorker } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'sprFlatFileFr'
);

export const sprFlatFileFrHook = hook;

export const sprFlatFileFrRouter = router({
	worker,
	files: fileProcedures(
		'flatFileFr',
		async (fileDataUrl, fileType) => {
			if (fileType !== 'text/csv')
				throw new TRPCError({
					message: 'Invalid File Type (CSV Only)',
					code: 'BAD_REQUEST'
				});

			const csvStart = atob(fileDataUrl.slice(fileDataUrl.indexOf(';base64,') + 8)).slice(0, 1000),
				headers = csvStart.split('\n')[0].replaceAll(/"/g, '').split(',');

			[
				'ProductId',
				'SKU Type',
				'SKU',
				'Desc1',
				'Desc2',
				'Desc3',
				'Marketing Text / Sales Copy',
				'keywords',
				'Product Specifications'
			].forEach((key) => {
				if (!headers.includes(key))
					throw new TRPCError({
						message: 'Missing Column: ' + key,
						code: 'BAD_REQUEST'
					});
			});
		},
		runWorker,
		async () => {
			try {
				return {
					name: `French Flat File (${new Date().toLocaleString()}).CSV`,
					dataUrl: await downloadSprFlatFile(undefined, undefined, 'FR_CA')
				};
			} catch (err) {
				console.error('Could not download Novexco French flat file:', err);
			}
			throw new TRPCError({
				message: 'Could not download file',
				code: 'INTERNAL_SERVER_ERROR'
			});
		},
		true
	)
});
