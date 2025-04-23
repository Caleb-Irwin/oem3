import { getTableName, relations } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  uniqueIndex,
  type AnyPgColumn,
  type AnyPgTable,
  type PgEnum
} from "drizzle-orm/pg-core";

export const cellConfigType = pgEnum("cellConfigType", [
  //Field settings
  "setting:custom",
  "setting:approve",
  "setting:approveCustom",
  "setting:tempOverride",
  // Field errors
  "error:multipleOptions",
  "error:missingValue",
  "error:needsApproval",
  // Field data
  "data:lastApprovedValue",
  "data:lastDisapprovedValue",
  "data:userNote"
]);

export function cellConfigTable<COLS extends [string, ...string[]]>({
  originalTable,
  primaryKey,
  columnEnum
}: {
  originalTable: AnyPgTable;
  primaryKey: AnyPgColumn<{ columnType: 'PgInteger' | 'PgSerial' }>;
  columnEnum: PgEnum<COLS>
}) {
  const tableName = `${getTableName(originalTable)}CellConfig`;

  const table = pgTable(
    tableName,
    {
      id: serial("id").primaryKey(),
      refId: integer("rowId")
        .notNull()
        .references(() => primaryKey, { onDelete: "cascade" }),
      col: columnEnum("col").notNull(),
      cellType: cellConfigType("cellType").notNull(),
      data: text("data"), // JSON
      notes: text("notes"), // User Viewable (HTML Encoded)
      created: bigint("created", { mode: "number" }).notNull(),
      lastUpdated: bigint("lastUpdated", { mode: "number" }).notNull(),
    },
    (genericTable) => {
      return {
        refIdIdx: uniqueIndex(`${tableName}_refId_idx`).on(genericTable.refId),
        colIdx: index(`${tableName}_col_idx`).on(genericTable.col),
        typeIdx: index(`${tableName}_cellType_idx`).on(genericTable.cellType),
        lastUpdatedIndex: index(`${tableName}_lastUpdated_idx`).on(
          genericTable.lastUpdated
        ),
      };
    }
  );

  const tableRelations = relations(table, ({ one }) => ({
    ref: one(table, { fields: [table.refId], references: [primaryKey] }),
  }));

  return [table, tableRelations];
}

export interface CellConfigData {
  value?: string | number | undefined | null;
  thresholdPercent?: number;
  options?: string[] | number[]
}