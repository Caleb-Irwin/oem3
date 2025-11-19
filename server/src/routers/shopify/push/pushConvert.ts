import type { ProductSetInput } from '../../../../types/admin.types';
import type { ImageMap, Product, Shopify, ShopifyMedia, ShopifyProductTypes } from './types';
import { ProductStatus, ProductVariantInventoryPolicy, WeightUnit } from './types';
import { SHOPIFY_LOCATION_ID_STORE, SHOPIFY_LOCATION_ID_WAREHOUSE } from '../../../env';
import { getAccessURLByFilePath } from '../../../utils/images';

/**
 * Converts a partial Shopify product object to ProductSetInput format
 * Handles unified product data and existing Shopify data
 */
export function convertToProductSetInput(
	product: Partial<Product>,
	shopifyData: Partial<Shopify> | null | undefined,
	options: { imageMap: ImageMap; shopifyMedia: ShopifyMedia[] }
): ProductSetInput {
	const input: ProductSetInput = {};

	if (shopifyData) {
		//@ts-expect-error This field exists but it is deprecated. However, it is needed for bulk mutations still.
		input.id = shopifyData.productId!;
	}

	// Title
	if (product.title !== undefined && product.title !== null) {
		input.title = product.title;
	}

	// Description
	if (product.description !== undefined && product.description !== null) {
		input.descriptionHtml = product.description;
	}

	// Handle - generate from title if not provided
	if (shopifyData?.handle) {
		input.handle = shopifyData.handle;
	} else if (product.title) {
		input.handle = (
			product.title +
			' ' +
			(product.gid ?? product.sprc ?? Math.random().toString(36).substring(2, 8))
		)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	// Status
	if (product.status !== undefined) {
		if (product.status === 'ACTIVE' || product.status === 'DISCONTINUED') {
			input.status = ProductStatus.Active;
		} else if (product.status === 'DISABLED') {
			input.status = ProductStatus.Archived;
		}
	}

	// Vendor
	if (product.vendor) {
		input.vendor = product.vendor;
	}

	// Product Type
	if (product.category) {
		const categoryMap: Record<typeof product.category, ShopifyProductTypes> = {
			office: 'Office/School',
			technologyInk: 'Printing/Technology',
			furniture: 'Furniture',
			cleaningBreakRoom: 'Cleaning/Breakroom'
		} as const;
		input.productType = categoryMap[product.category];
	}

	// Tags
	if (product.inFlyer || shopifyData?.tagsJsonArr) {
		try {
			const existingTags = JSON.parse(shopifyData?.tagsJsonArr ?? '[]');
			if (Array.isArray(existingTags)) {
				if (product.inFlyer && !existingTags.includes('Flyer')) {
					existingTags.push('Flyer');
					input.tags = existingTags satisfies string[];
				} else if (!product.inFlyer && existingTags.includes('Flyer')) {
					input.tags = existingTags.filter((tag) => tag !== 'Flyer') satisfies string[];
				}
				input.tags = existingTags;
			}
		} catch (e) {
			// Invalid JSON, skip tags
		}
	}

	// Images
	input.files = getFiles(product, options);

	// Product Options
	input.productOptions = [{ name: 'Title', values: [{ name: 'Default Title' }] }];

	// Variants
	const variant: NonNullable<ProductSetInput['variants']>[number] = {
		optionValues: [{ optionName: 'Title', name: 'Default Title' }]
	};

	// Variant ID
	if (shopifyData?.variantId) {
		variant.id = shopifyData.variantId;
	}

	// Price (convert cents to dollars)
	if (product.onlinePriceCents !== undefined && product.onlinePriceCents !== null) {
		variant.price = (product.onlinePriceCents / 100).toFixed(2);
	}
	// Compare at price
	if (product.onlineComparePriceCents !== undefined && product.onlineComparePriceCents !== null) {
		variant.compareAtPrice = (product.onlineComparePriceCents / 100).toFixed(2);
	} else {
		variant.compareAtPrice = null;
	}

	// SKU
	if (product.gid || product.sprc) {
		variant.sku = product.gid || product.sprc || undefined;
	}

	// Barcode (UPC)
	if (product.upc) {
		variant.barcode = product.upc;
	}

	// Taxable
	variant.taxable = true;

	// Inventory quantities
	if (product.availableForSaleOnline) {
		variant.inventoryPolicy = ProductVariantInventoryPolicy.Continue;
		variant.inventoryQuantities = [
			{
				locationId: SHOPIFY_LOCATION_ID_STORE,
				name: 'on_hand',
				quantity: (product.localInventory ?? 0) >= 0 ? (product.localInventory ?? 0) : 0
			},
			{
				locationId: SHOPIFY_LOCATION_ID_WAREHOUSE,
				name: 'on_hand',
				quantity: (product.guildInventory ?? 0) >= 0 ? (product.guildInventory ?? 0) : 0
			}
		];
	} else {
		variant.inventoryPolicy = ProductVariantInventoryPolicy.Deny;
		variant.inventoryQuantities = [
			{
				locationId: SHOPIFY_LOCATION_ID_STORE,
				name: 'on_hand',
				quantity: 0
			},
			{
				locationId: SHOPIFY_LOCATION_ID_WAREHOUSE,
				name: 'available',
				quantity: 0
			}
		];
	}

	variant.inventoryItem = {
		requiresShipping: true,
		cost:
			product.guildCostCents || product.sprCostCents
				? ((product.guildCostCents || product.sprCostCents || 0) / 100).toFixed(2)
				: null,
		measurement: null,
		tracked: true
	};

	if (product.weightGrams) {
		variant.inventoryItem.measurement = {
			weight: {
				unit: WeightUnit.Grams,
				value: product.weightGrams
			}
		};
	}

	input.variants = [variant];

	return input;
}

function getFiles(
	product: Partial<Product>,
	{ imageMap, shopifyMedia }: { imageMap: ImageMap; shopifyMedia: ShopifyMedia[] }
): ProductSetInput['files'] {
	const files: ProductSetInput['files'] = [];

	// Collect all image URLs
	const imageUrls: Array<{ url: string; alt?: string }> = [];

	if (product.primaryImage) {
		imageUrls.push({
			url: product.primaryImage,
			alt: product.primaryImageDescription || undefined
		});
	}

	if (product.otherImagesJsonArr) {
		try {
			const otherImages = JSON.parse(product.otherImagesJsonArr);
			if (Array.isArray(otherImages)) {
				for (const { url, description } of otherImages) {
					if (typeof url === 'string') {
						imageUrls.push({
							url,
							alt: typeof description === 'string' ? description : undefined
						});
					}
				}
			}
		} catch (e) {
			// Invalid JSON, skip other images
		}
	}

	const shopifyMediaSet = new Map<string, ShopifyMedia>(
		shopifyMedia.map((media) => [media.originalUploadUrl, media])
	);

	imageUrls.forEach(({ url, alt }) => {
		const shopMedia = shopifyMediaSet.get(url);
		if (shopMedia) {
			files.push({
				id: shopMedia.shopifyMediaId,
				alt
			});
		} else {
			if (
				url.startsWith('https://shopofficeonline.com/ProductImages/') ||
				url.startsWith('https://img.shopofficeonline.com/venxia')
			) {
				const image = imageMap.get(url);
				if (image && image.filePath) {
					const newUrl = getAccessURLByFilePath(image.filePath);
					files.push({
						originalSource: newUrl,
						alt,
						filename: url // DELETE in next step
					});
				} else {
					// console.log('Image not found in imageMap for URL:', url);
				}
			} else {
				files.push({
					originalSource: url,
					alt
				});
			}
		}
	});

	return files;
}

export function shopifyToProductSetInput(shopify: Shopify): ProductSetInput {
	const input: ProductSetInput = {};

	//@ts-expect-error This field exists but it is deprecated. However, it is needed for bulk mutations still.
	input.id = shopify.productId;

	// Title
	if (shopify.title) {
		input.title = shopify.title;
	}

	// Description
	if (shopify.htmlDescription) {
		input.descriptionHtml = shopify.htmlDescription;
	}

	// Handle
	if (shopify.handle) {
		input.handle = shopify.handle;
	}

	// Status
	if (shopify.status) {
		switch (shopify.status) {
			case 'ACTIVE':
				input.status = ProductStatus.Active;
				break;
			case 'ARCHIVED':
				input.status = ProductStatus.Archived;
				break;
			case 'DRAFT':
				input.status = ProductStatus.Draft;
				break;
			case 'UNLISTED':
				input.status = ProductStatus.Unlisted;
				break;
		}
	}

	// Vendor
	if (shopify.vendor) {
		input.vendor = shopify.vendor;
	}

	// Product Type
	if (shopify.productType) {
		input.productType = shopify.productType;
	}

	// Tags
	if (shopify.tagsJsonArr) {
		try {
			const tags = JSON.parse(shopify.tagsJsonArr);
			if (Array.isArray(tags)) {
				input.tags = tags;
			}
		} catch (e) {
			// ignore
		}
	}

	// Files
	if (shopify.allMediaJSONArray) {
		try {
			const media = JSON.parse(shopify.allMediaJSONArray);
			if (Array.isArray(media)) {
				input.files = media.map((m: any) => ({
					id: m.id,
					alt: m.alt || undefined
				}));
			}
		} catch (e) {
			// ignore
		}
	}

	// Product Options
	input.productOptions = [{ name: 'Title', values: [{ name: 'Default Title' }] }];

	// Variants
	const variant: NonNullable<ProductSetInput['variants']>[number] = {
		optionValues: [{ optionName: 'Title', name: 'Default Title' }]
	};

	// Variant ID
	if (shopify.variantId) {
		variant.id = shopify.variantId;
	}

	// Price
	if (shopify.vPriceCents !== null) {
		variant.price = (shopify.vPriceCents / 100).toFixed(2);
	}

	// Compare at price
	if (shopify.vComparePriceCents !== null) {
		variant.compareAtPrice = (shopify.vComparePriceCents / 100).toFixed(2);
	} else {
		variant.compareAtPrice = null;
	}

	// SKU
	if (shopify.vSku) {
		variant.sku = shopify.vSku;
	}

	// Barcode
	if (shopify.vBarcode) {
		variant.barcode = shopify.vBarcode;
	}

	// Taxable
	variant.taxable = true;

	// Inventory Policy
	if (shopify.vInventoryPolicyContinue !== null) {
		variant.inventoryPolicy = shopify.vInventoryPolicyContinue
			? ProductVariantInventoryPolicy.Continue
			: ProductVariantInventoryPolicy.Deny;
	}

	// Inventory Quantities
	const inventoryQuantities = [];
	if (shopify.vInventoryOnHandStore !== null) {
		inventoryQuantities.push({
			locationId: SHOPIFY_LOCATION_ID_STORE,
			name: 'on_hand',
			quantity: shopify.vInventoryOnHandStore
		});
	}
	if (shopify.vInventoryOnHandWarehouse0 !== null) {
		inventoryQuantities.push({
			locationId: SHOPIFY_LOCATION_ID_WAREHOUSE,
			name: 'on_hand',
			quantity: shopify.vInventoryOnHandWarehouse0
		});
	}
	if (inventoryQuantities.length > 0) {
		variant.inventoryQuantities = inventoryQuantities;
	}

	// Inventory Item
	variant.inventoryItem = {
		requiresShipping: shopify.vRequiresShipping ?? true,
		cost: shopify.vUnitCostCents ? (shopify.vUnitCostCents / 100).toFixed(2) : null,
		measurement: null,
		tracked: true
	};

	if (shopify.vWeightGrams) {
		variant.inventoryItem.measurement = {
			weight: {
				unit: WeightUnit.Grams,
				value: shopify.vWeightGrams
			}
		};
	}

	input.variants = [variant];

	return input;
}
