import { pgTable, serial, bigint, text, pgEnum, integer } from 'drizzle-orm/pg-core';
import { files } from './files.table';
import {
	guildFlyer,
	guildInventory,
	sprPriceFile,
	shopify,
	uniref,
	type guildData,
	type qb,
	sprFlatFile,
	unifiedGuild
} from '../db.schema';
import { relations } from 'drizzle-orm';

export const changesetType = pgEnum('changeset_type', [
		'qb',
		'guildData',
		'guildInventory',
		'guildFlyer',
		'shopify',
		'sprPriceFile',
		'sprFlatFile',
		'unifiedGuild'
	]),
	changesetStatusType = pgEnum('changeset_status_type', ['generating', 'completed']);
export type ChangesetType = (typeof changesetType.enumValues)[number];
export type ChangesetTable =
	| typeof qb
	| typeof guildData
	| typeof guildInventory
	| typeof guildFlyer
	| typeof shopify
	| typeof sprPriceFile
	| typeof sprFlatFile
	| typeof unifiedGuild;

export const changesets = pgTable('changesets', {
	id: serial('id').primaryKey(),
	type: changesetType('type').notNull(),
	status: changesetStatusType('status').notNull(),
	file: integer('file').references(() => files.id, {
		onDelete: 'set null'
	}),
	summary: text('summary'),
	created: bigint('uploadedTime', { mode: 'number' }).notNull()
});

export const changesetsRelation = relations(changesets, ({ one }) => ({
	uniref: one(uniref, {
		fields: [changesets.id],
		references: [uniref.changeset]
	})
}));
