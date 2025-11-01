import { eq } from 'drizzle-orm';
import type { DeletionEvent, Product, Variant } from '.';
import { work } from '../../utils/workerBase';
import { shopify, statusEnum } from './table';
import { enforceEnum, genDiffer, removeNaN } from '../../utils/changeset.helpers';
import type { MediaImage } from '../../../types/admin.types';

work({
	process: async ({ db, message, progress, utils: { getFileDataUrl, createChangeset } }) => {
		const fileId = (message as { fileId: number }).fileId,
			changeset = await createChangeset(shopify, fileId),
			dataUrl = await getFileDataUrl(fileId),
			rows = atob(dataUrl.slice(dataUrl.indexOf('base64,') + 7)).split('\n'),
			productsMap = new Map<string, OutProduct>(),
			variants: VariantWithParent[] = [],
			media: MediaWithParent[] = [],
			deletionEvents: DeletionEvent[] = [];

		rows
			.filter((row) => row !== '' && row[0] === '{')
			.forEach((row) => {
				const obj = JSON.parse(row) as
					| PartialProduct
					| VariantWithParent
					| DeletionEvent
					| MediaWithParent;

				if ((obj as VariantWithParent)?.__parentId) {
					if ((obj as VariantWithParent)?.id.startsWith('gid://shopify/ProductVariant/')) {
						variants.push(obj as VariantWithParent);
					} else if ((obj as VariantWithParent)?.id.startsWith('gid://shopify/MediaImage/')) {
						media.push(obj as MediaWithParent);
					} else {
						console.error('Unknown child type', obj);
					}
				} else if ((obj as PartialProduct)?.['id']?.includes('gid://shopify/Product/')) {
					productsMap.set((obj as PartialProduct)['id'], obj as OutProduct);
				} else if ((obj as DeletionEvent)?.['subjectId']?.includes('gid://shopify/Product/')) {
					deletionEvents.push(obj as DeletionEvent);
				} else {
					console.error('Unknown object type', obj);
				}
			});

		variants.forEach((variant) => {
			const parent = productsMap.get(variant.__parentId);
			if (!parent) {
				console.error('Parent product not found', variant);
				return;
			}
			parent.defaultVariant = variant;
		});

		media.forEach((mediaItem) => {
			const parent = productsMap.get(mediaItem.__parentId);
			if (!parent) {
				console.error('Parent product not found for media', mediaItem);
				return;
			}
			if (!parent.media) parent.media = [];
			parent.media.push(mediaItem);
		});

		const products = Array.from(productsMap.values());

		await db.transaction(async (db) => {
			const prevItems = new Map(
					(
						await db.query.shopify.findMany({
							with: { uniref: true }
						})
					).map((item) => [item.productId, item])
				),
				delItems = await Promise.all(
					deletionEvents.map(
						async (event) =>
							await db.query.shopify.findFirst({
								with: { uniref: true },
								where: eq(shopify.productId, event.subjectId)
							})
					)
				),
				customDeletedItems = delItems.filter(
					(item) => item !== undefined && item.deleted === false
				) as Exclude<(typeof delItems)[number], undefined>[];

			await changeset.process({
				db,
				prevItems,
				rawItems: products,
				customDeletedItems,
				transform,
				extractId: (product) => product.productId,
				diff: genDiffer(
					[
						'vInventoryAvailableStore',
						'vInventoryOnHandStore',
						'vInventoryCommittedStore',
						'vInventoryOnHandWarehouse0'
					],
					[
						'productId',
						'handle',
						'title',
						'htmlDescription',
						'imageId',
						'imageAltText',
						'imageUrl',
						'totalInventory',
						'tagsJsonArr',
						'hasOnlyDefaultVariant',
						'publishedAt',
						'updatedAt',
						'status',
						'variantId',
						'vPriceCents',
						'vComparePriceCents',
						'vWeightGrams',
						'vSku',
						'vBarcode',
						'vInventoryPolicyContinue',
						'vRequiresShipping',
						'vUnitCostCents',
						'vInventoryAvailableStore',
						'vInventoryOnHandStore',
						'vInventoryCommittedStore',
						'vInventoryOnHandWarehouse0',
						'vendor',
						'onlineStoreUrl',
						'onlineStorePreviewUrl',
						'allMediaJSONArray'
					]
				),
				progress,
				fileId
			});
		});
	}
});

const transform = (product: OutProduct): typeof shopify.$inferInsert => {
	const variant = product.defaultVariant as VariantWithParent;
	return {
		productId: product.id,
		handle: product.handle,
		title: product.title ?? '',
		htmlDescription: product.descriptionHtml,
		onlineStoreUrl: product.onlineStoreUrl,
		imageId: product.featuredMedia?.id,
		imageAltText: product.featuredMedia?.preview?.image?.altText,
		imageUrl: product.featuredMedia?.preview?.image?.url,
		allMediaJSONArray: JSON.stringify(
			(product.media ?? []).map((media) => ({
				id: media.id,
				alt: media.alt,
				mediaContentType: media.mediaContentType,
				status: media.status,
				url: media.preview?.image?.url,
				description: media.preview?.image?.altText
			}))
		),
		vendor: product.vendor,
		totalInventory: product.totalInventory,
		tagsJsonArr: JSON.stringify(product.tags),
		hasOnlyDefaultVariant: product.hasOnlyDefaultVariant,
		publishedAt: new Date(product.publishedAt).valueOf(),
		updatedAt: new Date(product.updatedAt).valueOf(),
		status: enforceEnum(product.status, statusEnum.enumValues) ?? 'ARCHIVED',
		variantId: variant.id,
		vPriceCents: removeNaN(Math.round(variant.price * 100)) as number,
		vComparePriceCents: removeNaN(Math.round(variant.compareAtPrice * 100)),
		vWeightGrams: variant.inventoryItem?.measurement?.weight?.value
			? removeNaN(Math.round(variant.inventoryItem?.measurement?.weight?.value * 1000))
			: null,
		vSku: variant.sku,
		vBarcode: variant.barcode,
		vInventoryPolicyContinue: variant.inventoryPolicy === 'CONTINUE',
		vRequiresShipping: variant.inventoryItem?.requiresShipping ?? true,
		vUnitCostCents: variant.inventoryItem.unitCost?.amount
			? removeNaN(Math.round(variant.inventoryItem.unitCost.amount * 100))
			: null,
		vInventoryAvailableStore:
			variant.inventoryItem?.store0?.quantities[0]?.quantity !== undefined
				? removeNaN(Math.round(variant.inventoryItem?.store0?.quantities[0]?.quantity))
				: null,
		vInventoryOnHandStore:
			variant.inventoryItem?.store0?.quantities[1]?.quantity !== undefined
				? removeNaN(Math.round(variant.inventoryItem?.store0?.quantities[1]?.quantity))
				: null,
		vInventoryCommittedStore:
			variant.inventoryItem?.store0?.quantities[0]?.quantity !== undefined
				? removeNaN(Math.round(variant.inventoryItem?.store0?.quantities[0]?.quantity))
				: null,
		vInventoryOnHandWarehouse0:
			variant.inventoryItem?.warehouse0?.quantities[0]?.quantity !== undefined
				? removeNaN(Math.round(variant.inventoryItem?.warehouse0?.quantities[0]?.quantity))
				: null,
		lastUpdated: 0
	};
};

type PartialProduct = Omit<Product, 'variants' | 'media'>;
type VariantWithParent = Variant & { __parentId: string };
type OutProduct = PartialProduct & { defaultVariant?: VariantWithParent; media: Media[] };
type Media = MediaImage;
type MediaWithParent = Media & { __parentId: string };
