import { db } from '../../../db';
import { work } from '../../../utils/workerBase';
import type { unifiedProduct } from '../../product/table';
import { shopify } from '../table';
import type { ProductSetInput } from '../../../../types/admin.types';
import type { ImageMap, ShopifyMedia, ShopifyProductTypes } from './types';
import { ProductStatus, ProductVariantInventoryPolicy, WeightUnit } from './types';
import { SHOPIFY_LOCATION_ID_STORE, SHOPIFY_LOCATION_ID_WAREHOUSE } from '../../../env';
import { getAccessURLByFilePath } from '../../../utils/images';

work({
	process: async ({ progress }) => {
		progress(-1);

		const { products, images } = await db.transaction(async (tx) => {
			const products = await tx.query.unifiedProduct.findMany({
				with: {
					shopifyMetadata: true,
					shopifyRowContent: true,
					uniref: true,
					shopifyMedia: true
				}
			});
			const images = await tx.query.images.findMany({
				columns: {
					sourceURL: true,
					filePath: true,
					uploadedTime: true,
					sourceHash: true
				},
				where: (images, { eq }) => eq(images.isThumbnail, false)
			});
			return { products, images };
		});

		const imageMap: ImageMap = new Map();
		for (const image of images) {
			if (image.sourceURL) imageMap.set(image.sourceURL, image);
		}

		type Product = (typeof products)[number];

		const connectedProducts: Product[] = [],
			disconnectedProducts: Product[] = [];

		for (const product of products) {
			if (product.shopifyRowContent) {
				connectedProducts.push(product);
			} else {
				disconnectedProducts.push(product);
			}
		}

		console.log(
			`Connected Products: ${connectedProducts.length}, Disconnected Products: ${disconnectedProducts.length}`
		);

		console.log(
			JSON.stringify(
				convertToProductSetInput(connectedProducts[0], connectedProducts[0].shopifyRowContent, {
					imageMap,
					shopifyMedia: connectedProducts[0].shopifyMedia as ShopifyMedia[]
				}),
				null,
				2
			)
		);

		console.log(
			JSON.stringify(
				convertToProductSetInput(
					disconnectedProducts[0],
					disconnectedProducts[0].shopifyRowContent,
					{
						imageMap,
						shopifyMedia: disconnectedProducts[0].shopifyMedia as ShopifyMedia[]
					}
				),
				null,
				2
			)
		);
	}
});

type Product = typeof unifiedProduct.$inferSelect;
type Shopify = typeof shopify.$inferSelect;

/**
 * Converts a partial Shopify product object to ProductSetInput format
 * Handles unified product data and existing Shopify data
 */
function convertToProductSetInput(
	product: Partial<Product>,
	shopifyData: Partial<Shopify> | null | undefined,
	options: { imageMap: ImageMap; shopifyMedia: ShopifyMedia[] }
): ProductSetInput {
	const input: ProductSetInput = {};

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
		input.handle = product.title
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
			if (Array.isArray(existingTags) && existingTags.length > 0) {
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
				quantity: product.localInventory ?? 0
			},
			{
				locationId: SHOPIFY_LOCATION_ID_WAREHOUSE,
				name: 'available',
				quantity: product.guildInventory ?? 0
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
		measurement: null
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
						alt
					});
				} else {
					console.log('Image not found in imageMap for URL:', url);
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
