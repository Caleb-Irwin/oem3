import { relations } from 'drizzle-orm';
import {
	bigint,
	boolean,
	index,
	pgTable,
	serial,
	text,
	uniqueIndex,
	varchar
} from 'drizzle-orm/pg-core';
import { sprFlatFile, uniref } from '../../../db.schema';

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
		deleted: boolean('deleted').default(false).notNull(),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(fr) => [
		uniqueIndex('sprFlatFileFr_etilizeId_idx').on(fr.etilizeId),
		index('sprFlatFileFr_last_updated_idx').on(fr.lastUpdated)
	]
);

export const sprFlatFileFrRelations = relations(sprFlatFileFr, ({ one }) => ({
	uniref: one(uniref, {
		fields: [sprFlatFileFr.id],
		references: [uniref.sprFlatFileFr]
	}),
	sprFlatItem: one(sprFlatFile, {
		fields: [sprFlatFileFr.etilizeId],
		references: [sprFlatFile.etilizeId]
	})
}));
