import type { ProductSetInput } from '../../../../types/admin.types';
import { convertToProductSetInput, shopifyToProductSetInput } from './pushConvert';
import type { ImageMap, ProductQueryRes } from './types';

export function diffUpload(products: ProductQueryRes[], options: { imageMap: ImageMap }) {
	const connectedProducts: ProductQueryRes[] = [],
		disconnectedProducts: ProductQueryRes[] = [];

	const toUploadNew: ProductUpload[] = [],
		toUploadUpdate: ProductUpload[] = [];

	for (const product of products) {
		if (product.shopifyRowContent) {
			connectedProducts.push(product);
		} else {
			disconnectedProducts.push(product);
		}
	}

	for (const product of disconnectedProducts) {
		const converted = convertToProductSetInput(product, null, {
				imageMap: options.imageMap,
				shopifyMedia: product.shopifyMedia
			}),
			newMedia = getNewMedia(converted);
		toUploadNew.push({
			product,
			productSetInput: converted,
			newMedia
		});
	}

	for (const product of connectedProducts) {
		const converted = convertToProductSetInput(product, product.shopifyRowContent, {
				imageMap: options.imageMap,
				shopifyMedia: product.shopifyMedia
			}),
			newMedia = getNewMedia(converted),
			existing = shopifyToProductSetInput(product.shopifyRowContent!);
		if (deepEqual(converted, existing)) {
			continue;
		}

		// If files match, remove them to avoid unnecessary updates
		if (deepEqual(converted.files, existing.files)) {
			delete converted.files;
		}

		// If variants match, remove them to avoid unnecessary updates
		if (deepEqual(converted.variants, existing.variants)) {
			delete converted.variants;
		}

		toUploadUpdate.push({
			product,
			productSetInput: converted,
			newMedia
		});
	}

	console.log(
		`SHOPIFY PUSH: New products to upload: ${toUploadNew.length}; To update: ${toUploadUpdate.length} of ${connectedProducts.length} connected products.`
	);

	return {
		toUploadNew,
		toUploadUpdate
	};
}

interface ProductUpload {
	product: ProductQueryRes;
	productSetInput: ProductSetInput;
	newMedia: NewMedia[];
}

interface NewMedia {
	originalSource: string;
}

function getNewMedia(productSetInput: ProductSetInput): NewMedia[] {
	return (
		productSetInput.files
			?.map((file) => {
				const fileName = file.filename;
				if (fileName) {
					delete file.filename;
					return {
						originalSource: fileName
					};
				}
				if (file.originalSource) {
					return {
						originalSource: file.originalSource
					};
				}
			})
			.filter((media): media is NewMedia => media !== undefined) || []
	);
}

function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;

	if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) {
		return false;
	}

	const keysA = Object.keys(a).filter((k) => a[k] !== undefined);
	const keysB = Object.keys(b).filter((k) => b[k] !== undefined);

	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
			return false;
		}
	}

	return true;
}
