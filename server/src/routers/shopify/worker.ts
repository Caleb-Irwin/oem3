import { eq } from "drizzle-orm";
import type { DeletionEvent, Product, Variant } from ".";
import { work } from "../../utils/workerBase";
import { shopify, statusEnum } from "./table";
import {
  enforceEnum,
  genDiffer,
  removeNaN,
} from "../../utils/changeset.helpers";

declare var self: Worker;
work({
  self,
  process: async ({
    db,
    message,
    progress,
    utils: { getFileDataUrl, createChangeset },
  }) => {
    const fileId = (message.data as { fileId: number }).fileId,
      changeset = await createChangeset(shopify, fileId),
      dataUrl = await getFileDataUrl(fileId),
      rows = atob(dataUrl.slice(dataUrl.indexOf("base64,") + 7)).split("\n"),
      productsMap = new Map<string, OutProduct>(),
      variants: VariantWithParent[] = [],
      deletionEvents: DeletionEvent[] = [];

    rows
      .filter((row) => row !== "" && row[0] === "{")
      .forEach((row) => {
        const obj = JSON.parse(row) as
          | PartialProduct
          | VariantWithParent
          | DeletionEvent;

        if ((obj as VariantWithParent)?.__parentId) {
          variants.push(obj as VariantWithParent);
        } else if (
          (obj as PartialProduct)?.id?.includes("gid://shopify/Product/")
        ) {
          productsMap.set((obj as PartialProduct).id, obj as OutProduct);
        } else if (
          (obj as DeletionEvent)?.subjectId?.includes("gid://shopify/Product/")
        ) {
          deletionEvents.push(obj as DeletionEvent);
        } else {
          console.error("Unknown object type", obj);
        }
      });

    variants.forEach((variant) => {
      const parent = productsMap.get(variant.__parentId);
      if (!parent) {
        console.error("Parent product not found", variant);
        return;
      }
      parent.defaultVariant = variant;
    });

    const products = Array.from(productsMap.values());

    await db.transaction(async (db) => {
      const prevItems = new Map(
          (
            await db.query.shopify.findMany({
              with: { uniref: true },
            })
          ).map((item) => [item.productId, item])
        ),
        delItems = await Promise.all(
          deletionEvents.map(
            async (event) =>
              await db.query.shopify.findFirst({
                with: { uniref: true },
                where: eq(shopify.productId, event.subjectId),
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
            "vInventoryAvailableStore",
            "vInventoryOnHandStore",
            "vInventoryCommittedStore",
            "vInventoryOnHandWarehouse0",
          ],
          [
            "productId",
            "handle",
            "title",
            "htmlDescription",
            "imageId",
            "imageAltText",
            "totalInventory",
            "tagsJsonArr",
            "hasOnlyDefaultVariant",
            "publishedAt",
            "updatedAt",
            "status",
            "variantId",
            "vPriceCents",
            "vComparePriceCents",
            "vWeightGrams",
            "vSku",
            "vBarcode",
            "vInventoryPolicyContinue",
            "vRequiresShipping",
            "vUnitCostCents",
            "vInventoryAvailableStore",
            "vInventoryOnHandStore",
            "vInventoryCommittedStore",
            "vInventoryOnHandWarehouse0",
          ]
        ),
        progress,
      });
    });
  },
});

const transform = (product: OutProduct): typeof shopify.$inferInsert => {
  const variant = product.defaultVariant as VariantWithParent;
  return {
    productId: product.id,
    handle: product.handle,
    title: product.title ?? "",
    htmlDescription: product.description,
    imageId: product.featuredImage?.id,
    imageAltText: product.featuredImage?.altText,
    totalInventory: product.totalInventory,
    tagsJsonArr: JSON.stringify(product.tags),
    hasOnlyDefaultVariant: product.hasOnlyDefaultVariant,
    publishedAt: new Date(product.publishedAt).valueOf(),
    updatedAt: new Date(product.updatedAt).valueOf(),
    status: enforceEnum(product.status, statusEnum.enumValues) ?? "ARCHIVED",
    variantId: variant.id,
    vPriceCents: removeNaN(Math.round(variant.price * 100)) as number,
    vComparePriceCents: removeNaN(Math.round(variant.compareAtPrice * 100)),
    vWeightGrams: variant.inventoryItem?.measurement?.weight?.value
      ? removeNaN(
          Math.round(variant.inventoryItem?.measurement?.weight?.value * 1000)
        )
      : null,
    vSku: variant.sku,
    vBarcode: variant.barcode,
    vInventoryPolicyContinue: variant.inventoryPolicy === "CONTINUE",
    vRequiresShipping: variant.inventoryItem?.requiresShipping ?? true,
    vUnitCostCents: variant.inventoryItem.unitCost?.amount
      ? removeNaN(Math.round(variant.inventoryItem.unitCost.amount * 100))
      : null,
    vInventoryAvailableStore:
      variant.inventoryItem?.store0?.quantities[0]?.quantity !== undefined
        ? removeNaN(
            Math.round(variant.inventoryItem?.store0?.quantities[0]?.quantity)
          )
        : null,
    vInventoryOnHandStore:
      variant.inventoryItem?.store0?.quantities[1]?.quantity !== undefined
        ? removeNaN(
            Math.round(variant.inventoryItem?.store0?.quantities[1]?.quantity)
          )
        : null,
    vInventoryCommittedStore:
      variant.inventoryItem?.store0?.quantities[0]?.quantity !== undefined
        ? removeNaN(
            Math.round(variant.inventoryItem?.store0?.quantities[0]?.quantity)
          )
        : null,
    vInventoryOnHandWarehouse0:
      variant.inventoryItem?.warehouse0?.quantities[0]?.quantity !== undefined
        ? removeNaN(
            Math.round(
              variant.inventoryItem?.warehouse0?.quantities[0]?.quantity
            )
          )
        : null,
    lastUpdated: 0,
  };
};

type PartialProduct = Omit<Product, "variants">;
type VariantWithParent = Variant & { __parentId: string };
type OutProduct = PartialProduct & { defaultVariant?: VariantWithParent };
