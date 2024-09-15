import { client, query } from '$lib/client';
import { writable, derived, type Readable, type Writable, get } from 'svelte/store';
import type { unifiedItems } from '../../../../../../server/src/db.schema';

export type Raw = Exclude<Awaited<ReturnType<typeof client.unifiedItems.item.query>>, undefined>;
const Query = () => query(client.unifiedItems.item, { id: 0 });

type UnifiedItemsTable = typeof unifiedItems.$inferSelect;
const keys: (keyof UnifiedItemsTable)[] = [
	'id',
	'type',
	'guild',
	'guildInventory',
	'guildFlyer',
	'qb',
	'qbAlt',
	'shopify',
	'shopifyAlt',
	'defaultAltConversionFactor',
	'defaultAltConversionFactorColumnSettings',
	'defaultUm',
	'defaultUmColumnSettings',
	'altUm',
	'altUmColumnSettings',
	'barcode',
	'barcodeColumnSettings',
	'sku',
	'skuColumnSettings',
	'priceCents',
	'priceColumnSettings',
	'altPriceCents',
	'altPriceColumnSettings',
	'flyerPriceCents',
	'flyerPriceColumnSettings',
	'altFlyerPriceCents',
	'altFlyerPriceColumnSettings',
	'storePriceCents',
	'storePriceColumnSettings',
	'storeAltPriceCents',
	'storeAltPriceColumnSettings',
	'onlinePriceCents',
	'onlinePriceColumnSettings',
	'onlineAltPriceCents',
	'onlineAltPriceColumnSettings',
	'storeFlyerPriceCents',
	'storeFlyerPriceColumnSettings',
	'storeFlyerAltPriceCents',
	'storeFlyerAltPriceColumnSettings',
	'onlineFlyerPriceCents',
	'onlineFlyerPriceColumnSettings',
	'onlineFlyerAltPriceCents',
	'onlineFlyerAltPriceColumnSettings',
	'title',
	'titleColumnSettings',
	'description',
	'descriptionColumnSettings',
	'imageUrl',
	'imageUrlColumnSettings',
	'storeInventory',
	'storeInventoryColumnSettings',
	'storeAltInventory',
	'storeAltInventoryColumnSettings',
	'warehouse0Inventory',
	'warehouse0InventoryColumnSettings',
	'warehouse0AltInventory',
	'warehouse0AltInventoryColumnSettings',
	'allowBackorder',
	'allowBackorderColumnSettings',
	'costCents',
	'costCentsColumnSettings',
	'deleted'
];
export type SmartChangesetKeys = (typeof keys)[number];
type ValueType = string | number | boolean | undefined | null;

export const getSmartChangeset = async (
	raw: ReturnType<typeof Query>
): Promise<{
	fields: {
		[key in SmartChangesetKeys]: {
			value: Writable<string | null>;
			original: Readable<ValueType>;
			changed: Readable<{
				key: SmartChangesetKeys;
				value: string | null;
				original: ValueType;
			}>;
		};
	};
	raw: UnifiedItemsTable;
	changes: Readable<
		{
			key: SmartChangesetKeys;
			value: string | null;
			original: ValueType;
		}[]
	>;
}> => {
	let doneInit = false;
	return new Promise((res) => {
		const value = get(raw);

		if (value === undefined || doneInit) return;
		doneInit = true;
		const keys = (Object.keys(value) as (keyof UnifiedItemsTable)[]).filter((key) =>
			['string', 'number', 'null', 'undefined'].includes(
				value[key] === null ? 'null' : typeof value[key]
			)
		);
		const rows = keys.map(
			(
				key
			): [
				SmartChangesetKeys,
				{
					value: Writable<string | null>;
					original: Readable<ValueType>;
					changed: Readable<
						| {
								key: SmartChangesetKeys;
								value: string | null;
								original: ValueType;
						  }
						| undefined
					>;
				}
			] => {
				const val = writable<string | null>(value[key]?.toString()),
					original = derived(raw, (val) => {
						return val?.[key];
					});

				return [
					key,
					{
						value: val,
						original,
						changed: derived([val, original], ([val, original]) => {
							return (val === '' ? null : val) != original
								? { key, value: val, original }
								: undefined;
						})
					}
				];
			}
		);

		const changes = derived(
			rows.map((row) => row[1].changed),
			(changes) => {
				return changes.filter((change) => change !== undefined);
			}
		);

		res({
			fields: Object.fromEntries(rows) as {
				[key in SmartChangesetKeys]: {
					value: Writable<string | null>;
					original: Readable<ValueType>;
					changed: Readable<{
						key: SmartChangesetKeys;
						value: string | null;
						original: ValueType;
					}>;
				};
			},
			raw: value,
			changes
		});
	});
};

export type ChangesType = Awaited<ReturnType<typeof getSmartChangeset>>['changes'];

export const readableKeys: { [key in SmartChangesetKeys]: string } = {
	id: 'Id',
	type: 'Type',
	guild: 'Guild Item Id',
	guildInventory: 'Guild Inventory Id',
	guildFlyer: 'Guild Flyer Id',
	qb: 'QB Item Id',
	qbAlt: 'QB Alt Item Id',
	shopify: 'Shopify Item Id',
	shopifyAlt: 'Shopify Alt Item Id',
	defaultAltConversionFactor: 'Default Alt Conversion Factor',
	defaultAltConversionFactorColumnSettings: 'Default Alt Conversion Factor Column Settings',
	defaultUm: 'Default UM',
	defaultUmColumnSettings: 'Default UM Column Settings',
	altUm: 'Alt UM',
	altUmColumnSettings: 'Alt UM Column Settings',
	barcode: 'Barcode',
	barcodeColumnSettings: 'Barcode Column Settings',
	sku: 'SKU',
	skuColumnSettings: 'SKU Column Settings',
	priceCents: 'Price Cents',
	priceColumnSettings: 'Price Column Settings',
	altPriceCents: 'Alt Price Cents',
	altPriceColumnSettings: 'Alt Price Column Settings',
	flyerPriceCents: 'Flyer Price Cents',
	flyerPriceColumnSettings: 'Flyer Price Column Settings',
	altFlyerPriceCents: 'Alt Flyer Price Cents',
	altFlyerPriceColumnSettings: 'Alt Flyer Price Column Settings',
	storePriceCents: 'Store Price Cents',
	storePriceColumnSettings: 'Store Price Column Settings',
	storeAltPriceCents: 'Store Alt Price Cents',
	storeAltPriceColumnSettings: 'Store Alt Price Column Settings',
	onlinePriceCents: 'Online Price Cents',
	onlinePriceColumnSettings: 'Online Price Column Settings',
	onlineAltPriceCents: 'Online Alt Price Cents',
	onlineAltPriceColumnSettings: 'Online Alt Price Column Settings',
	storeFlyerPriceCents: 'Store Flyer Price Cents',
	storeFlyerPriceColumnSettings: 'Store Flyer Price Column Settings',
	storeFlyerAltPriceCents: 'Store Flyer Alt Price Cents',
	storeFlyerAltPriceColumnSettings: 'Store Flyer Alt Price Column Settings',
	onlineFlyerPriceCents: 'Online Flyer Price Cents',
	onlineFlyerPriceColumnSettings: 'Online Flyer Price Column Settings',
	onlineFlyerAltPriceCents: 'Online Flyer Alt Price Cents',
	onlineFlyerAltPriceColumnSettings: 'Online Flyer Alt Price Column Settings',
	title: 'Title',
	titleColumnSettings: 'Title Column Settings',
	description: 'Description',
	descriptionColumnSettings: 'Description Column Settings',
	imageUrl: 'Image Url',
	imageUrlColumnSettings: 'Image Url Column Settings',
	storeInventory: 'Store Inventory',
	storeInventoryColumnSettings: 'Store Inventory Column Settings',
	storeAltInventory: 'Store Alt Inventory',
	storeAltInventoryColumnSettings: 'Store Alt Inventory Column Settings',
	warehouse0Inventory: 'Warehouse 0 Inventory',
	warehouse0InventoryColumnSettings: 'Warehouse 0 Inventory Column Settings',
	warehouse0AltInventory: 'Warehouse 0 Alt Inventory',
	warehouse0AltInventoryColumnSettings: 'Warehouse 0 Alt Inventory Column Settings',
	allowBackorder: 'Allow Backorder',
	allowBackorderColumnSettings: 'Allow Backorder Column Settings',
	costCents: 'Cost Cents',
	costCentsColumnSettings: 'Cost Cents Column Settings',
	deleted: 'Deleted',
	lastUpdated: 'Last Updated'
} as const;
