import { work } from '../../../utils/workerBase';
import Papa from 'papaparse';
import { sprFlatFile } from './table';
import { genDiffer, removeNaN } from '../../../utils/changeset.helpers';

work({
	process: async ({ db, message, progress, utils: { getFileDataUrl, createChangeset } }) => {
		const fileId = (message as { fileId: number }).fileId,
			changeset = await createChangeset(sprFlatFile, fileId),
			dataUrl = await getFileDataUrl(fileId),
			res = Papa.parse(atob(dataUrl.slice(dataUrl.indexOf('base64,') + 7)), {
				header: true
			});

		await db.transaction(async (db) => {
			const prevItems = new Map(
				(await db.query.sprFlatFile.findMany({ with: { uniref: true } })).map((item) => [
					item.etilizeId,
					item
				])
			);

			await changeset.process({
				db,
				rawItems: (res.data as FlatFileRaw[]).filter(
					(item) => (item?.SKU?.length ?? 0) > 0 && item['SKU Type'] === 'SPRC' && item['ProductId']
				),
				prevItems,
				transform: transformSprFlatFile,
				extractId: (item) => item.etilizeId,
				diff: genDiffer(
					[],
					[
						'sprcSku',
						'etilizeId',
						'sprCatalogSku',
						'brandName',
						'productType',
						'productLine',
						'productSeries',
						'fullDescription',
						'mainTitle',
						'subTitle',
						'marketingText',
						'subClassNumber',
						'subClassName',
						'classNumber',
						'className',
						'departmentNumber',
						'departmentName',
						'masterDepartmentNumber',
						'masterDepartmentName',
						'unspsc',
						'keywords',
						'manufacturerId',
						'manufacturerName',
						'productSpecs',
						'countyOfOrigin',
						'assemblyRequired',
						'image255',
						'image75'
					]
				),
				progress,
				fileId
			});
		});
	}
});

function transformSprFlatFile(item: FlatFileRaw): typeof sprFlatFile.$inferInsert {
	return {
		sprcSku: item.SKU,
		etilizeId: item['ProductId'],
		sprCatalogSku: item['Catalog Sku'],
		brandName: item['Brand Name'],
		productType: item['Product Type'],
		productLine: item['Product Line'],
		productSeries: item['Product Series'],
		fullDescription: item['Desc1'],
		mainTitle: item['Desc2'],
		subTitle: item['Desc3'],
		marketingText: item['Marketing Text / Sales Copy'],
		subClassNumber: removeNaN(parseInt(item['Sub Class Number'])),
		subClassName: item['Sub Class Name'],
		classNumber: removeNaN(parseInt(item['Class Number'])),
		className: item['Class Name'],
		departmentNumber: removeNaN(parseInt(item['Department Number'])),
		departmentName: item['Department Name'],
		masterDepartmentNumber: removeNaN(parseInt(item['Master Department Number'])),
		masterDepartmentName: item['Master Department Name'],
		unspsc: removeNaN(parseInt(item['UNSPSC'])),
		keywords: item.keywords,
		manufacturerId: removeNaN(parseInt(item['Manufacturer ID'])),
		manufacturerName: item['Manufacturer Name'],
		productSpecs: item['Product Specifications'],
		countyOfOrigin: item['Country Of Origin'],
		assemblyRequired:
			item['Assembly Required'] === 'Yes'
				? true
				: item['Assembly Required'] === 'No'
					? false
					: null,
		image255: item['Image Type 225'],
		image75: item['Image Type 75'],
		lastUpdated: 0
	};
}

interface FlatFileRaw {
	ProductId: string;
	'SKU Type': string;
	SKU: string;
	LocaleId: string;
	'Catalog Sku': string;
	'Brand Name': string;
	'Product Type': string;
	'Product Line': string;
	'Product Series': string;
	Desc1: string;
	Desc2: string;
	Desc3: string;
	'Marketing Text / Sales Copy': string;
	'Sub Class Number': string;
	'Sub Class Name': string;
	'Class Number': string;
	'Class Name': string;
	'Department Number': string;
	'Department Name': string;
	'Master Department Number': string;
	'Master Department Name': string;
	UNSPSC: string;
	keywords: string;
	'Manufacturer ID': string;
	'Manufacturer Name': string;
	'Product Specifications': string;
	'Country Of Origin': string;
	Recycled: string;
	'Recycled PCW': string;
	'Recycled Total': string;
	'Assembly Required': string;
	'Image Type 225': string;
	'Image Type 75': string;
}
