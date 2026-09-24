import papa from 'papaparse';
import type { sprSkus } from './table';

export function parseEtilizeCsv<T>(contents: string): T[] {
	const { data, errors } = papa.parse<T>(contents, {
		delimiter: ',',
		header: false,
		skipEmptyLines: true
	});
	if (errors.length) throw new Error(`Invalid Etilize CSV: ${errors[0].message}`);
	return data;
}

const skuFiles = [
	['CWS', 'EN_CA_SKU_CWS_A_productskus.csv'],
	['UPC', 'EN_CA_SKU_UPC_productskus.csv'],
	['GTIN', 'EN_CA_SKU_GTIN_productskus.csv'],
	['SPRC', 'EN_CA_SKU_SPRC_productskus.csv'],
	['NOVEXCO', 'EN_CA_SKU_Novexco_productskus.csv']
] as const;

export function readSkuMappings(
	readFile: (filename: string) => string
): (typeof sprSkus.$inferInsert)[] {
	return skuFiles.flatMap(([type, filename]) =>
		parseEtilizeCsv<string[]>(readFile(filename)).map((row, index) => {
			const etilizeId = row[0]?.trim();
			const sku = row[2]?.trim();
			if (!etilizeId || !sku) {
				throw new Error(`Missing Etilize ID or SKU in ${filename}, record ${index + 1}`);
			}
			return { etilizeId, type, sku };
		})
	);
}
