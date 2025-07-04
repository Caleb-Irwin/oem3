import { bigint, index, integer, pgEnum, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { changesets } from './changeset.table';
import { resourceTypeEnum, uniref } from './uniref.table';

export const entryType = pgEnum('history_entry_type', ['create', 'delete', 'update']);
export type EntryType = (typeof entryType.enumValues)[number];

export const confType = pgEnum('history_conf_type', ['setting', 'error']);

export const history = pgTable(
	'history',
	{
		id: serial('id').primaryKey(),
		entryType: entryType('entry_type').notNull(),
		changeset: integer('set').references(() => changesets.id, {
			onDelete: 'set null'
		}),
		uniref: integer('uniref')
			.references(() => uniref.uniId, { onDelete: 'cascade' })
			.notNull(),
		resourceType: resourceTypeEnum('resource_type').notNull(),
		data: text('data'),
		confCell: text('conf_cell'),
		confType: confType('conf_type'),
		created: bigint('created', { mode: 'number' }).notNull()
	},
	(history) => [
		index('history_changes_set_idx').on(history.changeset),
		index('history_uniref_idx').on(history.uniref),
		index('history_resource_type_idx').on(history.resourceType),
		index('history_created_idx').on(history.created),
		index('history_entry_type_idx').on(history.entryType)
	]
);
