import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';

export function shopifyConnect() {
	const SHOPIFY_API_KEY = process.env['SHOPIFY_API_KEY'] as string;
	const SHOPIFY_ADMIN_API_SECRET_KEY = process.env['SHOPIFY_ADMIN_API_SECRET_KEY'] as string;
	const SHOPIFY_ADMIN_API_ACCESS_TOKEN = process.env['SHOPIFY_ADMIN_API_ACCESS_TOKEN'] as string;
	const SHOPIFY_SHOP = process.env['SHOPIFY_SHOP'] as string;

	if (
		!SHOPIFY_API_KEY ||
		!SHOPIFY_ADMIN_API_SECRET_KEY ||
		!SHOPIFY_ADMIN_API_ACCESS_TOKEN ||
		!SHOPIFY_SHOP
	)
		throw new Error('Shopify API Keys not set');

	const shopify = shopifyApi({
		apiKey: SHOPIFY_API_KEY,
		apiSecretKey: SHOPIFY_ADMIN_API_SECRET_KEY,
		adminApiAccessToken: SHOPIFY_ADMIN_API_ACCESS_TOKEN,
		scopes: ['write_products', 'read_products', 'write_inventory', 'read_inventory'],
		isEmbeddedApp: false,
		apiVersion: ApiVersion.October25,
		hostName: `${SHOPIFY_SHOP}.myshopify.com`,
		isCustomStoreApp: true
	});

	const session = new Session({
		id: 'not-a-real-session-id', // must have a string value, will be ignored
		shop: `${SHOPIFY_SHOP}.myshopify.com`, // MUST match shop on which custom app is installed
		state: 'state', // must have a string value, will be ignored
		isOnline: false // must have a boolean value, will be ignored
	});

	const getShopifyGQlClient = () =>
		new shopify.clients.Graphql({
			session,
			apiVersion: ApiVersion.July24
		});

	const client = getShopifyGQlClient();

	return { shopify, client };
}
