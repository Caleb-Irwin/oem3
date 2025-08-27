import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	pgTable,
	serial,
	text,
	varchar,
	bigint
} from 'drizzle-orm/pg-core';
import { sprEnhancedContent, uniref } from '../../../db.schema';

export const sprFlatFile = pgTable(
	'sprFlatFile',
	{
		id: serial('id').primaryKey(),
		sprcSku: varchar('sprcSku', { length: 256 }).notNull(),
		etilizeId: varchar('etilizeId', { length: 32 }).notNull(),
		sprCatalogSku: varchar('sprCatalogSku', { length: 256 }),
		brandName: varchar('brandName', { length: 256 }),
		productType: varchar('productType', { length: 256 }),
		productLine: varchar('productLine', { length: 256 }),
		productSeries: varchar('productSeries', { length: 256 }),
		fullDescription: text('fullDescription'),
		mainTitle: text('mainTitle'),
		subTitle: text('subTitle'),
		marketingText: text('marketingText'),
		subClassNumber: integer('subClassNumber'),
		subClassName: varchar('subClassName', { length: 256 }),
		classNumber: integer('classNumber'),
		className: varchar('className', { length: 256 }),
		departmentNumber: integer('departmentNumber'),
		departmentName: varchar('departmentName', { length: 256 }),
		masterDepartmentNumber: integer('masterDepartmentNumber'),
		masterDepartmentName: varchar('masterDepartmentName', { length: 256 }),
		unspsc: integer('unspsc'),
		keywords: text('keywords'),
		manufacturerId: integer('manufacturerId'),
		manufacturerName: varchar('manufacturerName', { length: 256 }),
		productSpecs: text('productSpecs'),
		countyOfOrigin: varchar('countyOfOrigin', { length: 256 }),
		assemblyRequired: boolean('assemblyRequired'),
		image255: varchar('image255', { length: 256 }),
		image75: varchar('image75', { length: 256 }),
		deleted: boolean('deleted').default(false).notNull(),
		lastUpdated: bigint('lastUpdated', { mode: 'number' }).notNull()
	},
	(spr) => {
		return [
			index('sprFlatFile_sprcSku_idx').on(spr.sprcSku),
			index('sprFlatFile_etilizeId_idx').on(spr.etilizeId),
			index('sprFlatFile_last_updated_idx').on(spr.lastUpdated)
		];
	}
);

export const sprFlatFileRelations = relations(sprFlatFile, ({ one }) => ({
	uniref: one(uniref, {
		fields: [sprFlatFile.id],
		references: [uniref.sprFlatFile]
	}),
	enhancedContent: one(sprEnhancedContent, {
		fields: [sprFlatFile.etilizeId],
		references: [sprEnhancedContent.etilizeId]
	})
}));
