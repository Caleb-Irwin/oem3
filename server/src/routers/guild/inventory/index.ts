import { TRPCError } from '@trpc/server';
import { router } from '../../../trpc';
import { fileProcedures } from '../../../utils/files';
import { managedWorker } from '../../../utils/managedWorker';
import { KV } from '../../../utils/kv';

const { worker, runWorker, hook } = managedWorker(
	new URL('worker.ts', import.meta.url).href,
	'guildInventory'
);

export const guildInventoryHook = hook;

const files = fileProcedures(
	'guildInventory',
	async (dataUrl, fileType) => {
		if (fileType !== 'text/csv') throw new Error('Invalid File Type (CSV Only)');

		const csvStart = atob(dataUrl.slice(dataUrl.indexOf(';base64,') + 8)).slice(0, 1000),
			headers = csvStart
				.split('\n')[0]
				.split(',')
				.map((x) => x.split('"')[1]);

		[
			'SKU',
			'Qty On Hand',
			'Product#',
			'UPC#',
			'SPR#',
			'Basics#',
			'CIS#',
			'Qty/UoM',
			'Unit of Measure'
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
		const kv = new KV('guildInventory');

		const res = await fetch(
			'http://www.guildstationers.com/images/+Public/+Data_Qty/qryInventory-2.csv'
		);

		const name =
			'Inventory @ ' +
			new Date(res.headers.get('Last-Modified') as string)
				.toLocaleString('en-CA', { timeZone: 'America/Regina' })
				.replaceAll('.', '') +
			'.csv';

		if ((await kv.get('lastDownloadedName')) === encodeURIComponent(name)) return null;

		const dataUrl = `data:${res.headers.get('Content-Type')};base64,${btoa(await res.text())}`;

		await kv.set('lastDownloadedName', encodeURIComponent(name));

		return { name, dataUrl };
	},
	true
);

export const inventoryRouter = router({
	files,
	worker
});
