import { env } from 'bun';

export const JWT_SECRET = env['JWT_SECRET'] as string,
	ADMIN_PASSWORD = env['ADMIN_PASSWORD'] as string,
	POSTGRESQL = env['POSTGRESQL'] as string,
	SHOPIFY_LOCATION_ID_STORE = env['SHOPIFY_LOCATION_ID_STORE'] as string,
	SHOPIFY_LOCATION_ID_WAREHOUSE = env['SHOPIFY_LOCATION_ID_WAREHOUSE'] as string;

if (!JWT_SECRET) throw new Error('Missing JWT_SECRET environment variable');
if (!ADMIN_PASSWORD) throw new Error('Missing ADMIN_PASSWORD environment variable');
if (!POSTGRESQL) throw new Error('Missing POSTGRESQL environment variable');
if (!SHOPIFY_LOCATION_ID_STORE)
	throw new Error('Missing SHOPIFY_LOCATION_ID_STORE environment variable');
if (!SHOPIFY_LOCATION_ID_WAREHOUSE)
	throw new Error('Missing SHOPIFY_LOCATION_ID_WAREHOUSE environment variable');
