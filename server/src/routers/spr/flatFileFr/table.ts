import { bigint, index, pgTable, serial, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

// French content from the Etilize FR_CA flat file, joined to sprFlatFile on etilizeId
export const sprFlatFileFr = pgTable(
	'sprFlatFileFr',
	{
		id: serial('id').primaryKey(),
		etilizeId: varchar('etilizeId', { length: 32 }).notNull(),
		sprcSku: varchar('sprcSku', { length: 256 }),
		fullDescription: text('fullDescription'),
		mainTitle: text('mainTitle'),
		subTitle: text('subTitle'),
		marketingText: text('marketingText'),
		productSpecs: text('productSpecs'),
		keywords: text('keywords'),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(fr) => [
		uniqueIndex('sprFlatFileFr_etilizeId_idx').on(fr.etilizeId),
		index('sprFlatFileFr_last_updated_idx').on(fr.lastUpdated)
	]
);
