import { ApiType, pluckConfig, preset } from '@shopify/api-codegen-preset';

export default {
	// For syntax highlighting / auto-complete when writing operations
	schema: 'https://shopify.dev/admin-graphql-direct-proxy/2025-10',
	documents: ['./src/**/*.{js,ts,jsx,tsx}'],
	projects: {
		default: {
			// For type extraction
			schema: 'https://shopify.dev/admin-graphql-direct-proxy/2025-10',
			documents: ['./src/**/*.{js,ts,jsx,tsx}'],
			extensions: {
				codegen: {
					// Enables support for `#graphql` tags, as well as `/* GraphQL */`
					pluckConfig,
					generates: {
						'./types/admin.schema.json': {
							plugins: ['introspection'],
							config: { minify: true }
						},
						'./types/admin.types.d.ts': {
							plugins: ['typescript']
						},
						'./types/admin.generated.d.ts': {
							preset,
							presetConfig: {
								apiType: ApiType.Admin
							}
						}
					}
				}
			}
		}
	}
};
