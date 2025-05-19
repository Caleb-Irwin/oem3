import {
  guildData,
  guildFlyer,
  guildInventory,
  unifiedGuild,
  unifiedGuildCellConfig,
  uniref,
} from "../db.schema";
import { db, db as DB, type Tx } from "../db";
import { eq, isNull, type SQLWrapper, gt, or } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { chunk } from "./chunk";
import {
  insertHistory,
  insertMultipleHistoryRows,
  type InsertHistoryRowOptions,
} from "./history";
import { KV } from "./kv";
import { cellTransformer, createCellConfigurator } from "./cellConfigurator";
import { runSerializable } from "./runSerializable";
import PromisePool from "@supercharge/promise-pool";

export function createUnifier<
  RowType extends TableType["$inferSelect"] & { uniref: { uniId: number }; id: number; deleted: boolean },
  TableType extends UnifiedTables
>({
  table,
  confTable,
  getRow,
  transform,
  connections,
  version,
}: {
  table: TableType;
  confTable: CellConfigTable;
  getRow: (id: number, db: Tx | typeof DB) => Promise<RowType>;
  transform: (
    item: RowType,
    t: typeof cellTransformer
  ) => {
      [K in keyof TableType["$inferSelect"]]: ReturnType<typeof cellTransformer>;
    };
  connections: Connections<RowType, TableType>;
  version: number;
}) {
  const tableConf = getTableConfig(table),
    unifiedTableName = tableConf.name,
    colTypes = {} as Record<
      keyof TableType["$inferSelect"],
      { dataType: "string" | "number" | "boolean"; notNull: boolean }
    >;
  tableConf.columns.forEach(({ name, dataType, notNull }) => {
    colTypes[name as keyof TableType["$inferSelect"]] = {
      dataType: dataType as "string" | "number" | "boolean",
      notNull,
    };
  });

  async function _modifyRow(
    id: number,
    row: Partial<TableType["$inferInsert"]>,
    db: Tx | typeof DB
  ) {
    await db
      .update(table)
      .set(row as unknown as any)
      .where(eq(table.id, id))
      .execute();
  }

  async function _updateRow({ id, db }: { id: number; db: Tx | typeof DB }) {
    const originalRow = await getRow(id, db);
    let updatedRow = structuredClone(originalRow);
    const cellConfigurator = await createCellConfigurator(confTable, id, db);
    // 1. Check + make connections
    const connectionsList = [
      connections.primaryTable,
      /* Secondary, */
      ...connections.otherTables,
    ];
    for (const connectionTable of connectionsList) {
      const otherConnections = await connectionTable.findConnections(
        updatedRow,
        db as typeof DB
      );
      const connectionRowKey =
        connectionTable.refCol as keyof TableType["$inferInsert"];

      // Un-match the connection if it is deleted and not primary
      if (!(connectionTable as PrimaryTableConnection<any, any, any>).newRowTransform && updatedRow[connectionRowKey] !== null && connectionTable.isDeleted(updatedRow)) {
        updatedRow[connectionRowKey] = null as any;
      }
      if (
        updatedRow[connectionRowKey] === null &&
        otherConnections.length > 0
      ) {
        updatedRow[connectionRowKey] = otherConnections[0] as any;
      }
      if (
        otherConnections.length > 1 ||
        (otherConnections.length === 1 &&
          updatedRow[connectionRowKey] !== otherConnections[0])
      ) {
        cellConfigurator.addError(connectionRowKey as any, {
          multipleOptions: {
            options: otherConnections.filter(
              (v) => v !== updatedRow[connectionRowKey]
            ),
            value: updatedRow[connectionRowKey] as any,
          },
        });
      }
      const newVal = cellConfigurator.getConfiguredCellValue(
        {
          key: connectionRowKey as any,
          val: updatedRow[connectionRowKey] as number,
          options: {},
        },
        {
          oldVal: originalRow[connectionRowKey] as number | null,
          dataType: "number",
          notNull: connectionTable === connections.primaryTable,
        }
      );
      if (originalRow[connectionRowKey] !== updatedRow[connectionRowKey]) {
        const existing = await db
          .select({ col: table[connectionRowKey as keyof TableType] as any })
          .from(table as any)
          .where(eq(table[connectionRowKey as keyof TableType] as any, newVal))
          .execute();
        if (existing.length > 0) {
          updatedRow[connectionRowKey] = originalRow[connectionRowKey];
          cellConfigurator.addError(connectionRowKey as any, {
            matchWouldCauseDuplicate: {
              value: newVal,
            },
          });
        } else {
          await _modifyRow(
            id,
            {
              [connectionRowKey]: newVal,
            } as any,
            db
          );
          updatedRow = await getRow(id, db);
        }
      }
    }
    if (connections.primaryTable.isDeleted(updatedRow) && !updatedRow.deleted) {
      const newVal = cellConfigurator.getConfiguredCellValue({
        key: "deleted",
        val: true,
        options: {},
      }, {
        oldVal: originalRow.deleted,
        dataType: "boolean",
        notNull: true,
      }) as boolean;
      if (newVal !== updatedRow.deleted) {
        updatedRow.deleted = newVal;
        await _modifyRow(id, { deleted: newVal } as any, db);
      }
    }

    // 2. Transform
    const transformed = transform(updatedRow, cellTransformer);

    // 3. Apply Overrides + Find Errors
    const changes: Partial<(typeof table)["$inferSelect"]> = {};
    for (const k of Object.keys(transformed)) {
      if (k === "id" || k === "lastUpdated") continue;
      const key = k as keyof (typeof table)["$inferInsert"];
      const newVal = cellConfigurator.getConfiguredCellValue(
        transformed[k as keyof typeof transformed],
        {
          oldVal: originalRow[key] as any,
          ...colTypes[key],
        }
      ) as any;
      if (originalRow[key] !== newVal) {
        changes[key] = newVal;
      }
    }

    const newErrors = await cellConfigurator.commitErrors();
    const hasChanges = Object.keys(changes).length > 0;

    // 4. Update Row
    if (hasChanges)
      await _modifyRow(id, { lastUpdated: Date.now(), ...changes }, db);

    // 5. Update History
    const history: InsertHistoryRowOptions<TableType["$inferSelect"]> | null =
      hasChanges
        ? {
          uniref: originalRow.uniref.uniId,
          prev: originalRow,
          entryType: "update",
          data: changes,
          created: Date.now(),
        }
        : null;
    if (history)
      await insertHistory({
        db,
        resourceType: unifiedTableName as any,
        ...history,
      });

    return {
      history,
      newErrors,
    };
  }

  async function updateRow(id: number) {
    return await runSerializable(async (tx) => {
      return await _updateRow({ id, db: tx });
    });
  }

  async function updateUnifiedTable({
    updateAll = false,
    progress,
  }: {
    updateAll?: boolean;
    progress?: (progress: number) => void;
  }) {
    if (progress) progress(-1);
    const kv = new KV("unifier/" + unifiedTableName, DB),
      newLastUpdated = Date.now(),
      lastUpdatedBySource: { [key: string]: number } = JSON.parse(
        (await kv.get("lastUpdatedBySource")) ?? "{}"
      ),
      rowsToUpdate = new Set<number>();
    if (parseInt((await kv.get("version")) ?? "-1") < version) {
      updateAll = true;
    }

    // 1. Add missing primary rows
    await DB.transaction(async (db) => {
      const missingPrimaryRows = await db
        .select()
        .from(connections.primaryTable.table)
        .leftJoin(
          table as UnifiedTables,
          eq(
            connections.primaryTable.table.id,
            table[connections.primaryTable.refCol] as SQLWrapper
          )
        )
        .where(isNull(table.id))
        .execute();
      const primaryTableName = getTableConfig(
        connections.primaryTable.table
      ).name;
      const rowsToInsert = missingPrimaryRows.map((v) =>
        connections.primaryTable.newRowTransform(
          v[primaryTableName as unknown as keyof typeof v] as any,
          newLastUpdated
        )
      );
      for (const chunkedRows of chunk(rowsToInsert)) {
        const rows = await db
          .insert(table as any)
          .values(chunkedRows)
          .returning({ id: table.id })
          .execute();
        rows.forEach(({ id }) => rowsToUpdate.add(id));
        const uniRows = await db
          .insert(uniref)
          .values(
            rows.map(({ id }) => {
              const obj: any = {
                resourceType: unifiedTableName as any,
              };
              obj[unifiedTableName] = id;
              return obj;
            })
          )
          .returning({ uniId: uniref.uniId })
          .execute();
        await insertMultipleHistoryRows({
          db,
          resourceType: unifiedTableName as any,
          rows: chunkedRows.map((v, i) => ({
            uniref: uniRows[i].uniId,
            entryType: "create",
            data: v,
            created: newLastUpdated,
          })),
        });
      }
    });
    const addedPrimaryRows = rowsToUpdate.size;

    // 2. Determine which rows need to be updated
    if (updateAll) {
      const allRows = await db
        .select({ id: table.id })
        .from(table as UnifiedTables)
        .execute();
      allRows.forEach((v) => rowsToUpdate.add(v.id));
    } else {
      const sourceTables = [
        connections.primaryTable,
        ...connections.otherTables,
      ];
      for (const sourceTable of sourceTables) {
        const lastUpdated =
          lastUpdatedBySource[sourceTable.refCol as string] ?? 0;
        const rows = await db
          .select({ id: table.id, lastUpdated: sourceTable.table.lastUpdated })
          .from(table as UnifiedTables)
          .leftJoin(
            sourceTable.table,
            eq(table[sourceTable.refCol] as SQLWrapper, sourceTable.table.id)
          )
          .where(
            or(
              isNull(sourceTable.table.lastUpdated),
              gt(sourceTable.table.lastUpdated, lastUpdated)
            )
          );
        lastUpdatedBySource[sourceTable.refCol as string] = rows.reduce(
          (prev, curr) =>
            curr.lastUpdated && prev < curr.lastUpdated
              ? curr.lastUpdated
              : prev,
          lastUpdated
        );
        if (lastUpdatedBySource[sourceTable.refCol as string] > lastUpdated) // If no rows are updated, there will also be no new connections
          rows.forEach((r) => rowsToUpdate.add(r.id));
      }
    }

    // 3. Update Rows
    if (progress) progress(0);
    let done = 0;
    await PromisePool.withConcurrency(addedPrimaryRows > 1000 ? 1 : 3)
      .for(Array.from(rowsToUpdate))
      .handleError(async (error) => {
        console.error("Error updating row:", error);
        throw error;
      })
      .onTaskFinished(() => {
        done++;
        if (progress && done % 100 === 0) progress(done / rowsToUpdate.size);
      })
      .process(async (id) => {
        await updateRow(id);
      });
    if (progress) progress(1);

    // 4. Finish
    await kv.set("lastUpdatedBySource", JSON.stringify(lastUpdatedBySource));
    await kv.set("version", version.toString());
  }

  return {
    updateUnifiedTable,
    updateRow,
  };
}

export type UnifiedTables = typeof unifiedGuild;
export type PrimarySourceTables = typeof unifiedGuild | typeof guildData;
// export type SecondarySourceTables = typeof unifiedSPR
export type OtherSourceTables = typeof guildInventory | typeof guildFlyer;

export type CellConfigTable = typeof unifiedGuildCellConfig;

interface TableConnection<
  RowType,
  UnifiedTable extends UnifiedTables,
  T extends PrimarySourceTables | OtherSourceTables
> {
  table: T;
  refCol: keyof UnifiedTable;
  recheckConnectionsOnFieldChange: string[];
  findConnections: (row: RowType, db: typeof DB) => Promise<number[]>; // Should not return deleted items
  isDeleted: (row: RowType) => boolean;
}

interface PrimaryTableConnection<
  RowType,
  UnifiedTable extends UnifiedTables,
  T extends PrimarySourceTables
> extends TableConnection<RowType, UnifiedTable, T> {
  newRowTransform: (
    row: T["$inferSelect"],
    lastUpdated: number
  ) => UnifiedTable["$inferInsert"];
}

interface Connections<RowType, UnifiedTable extends UnifiedTables> {
  primaryTable: PrimaryTableConnection<
    RowType,
    UnifiedTable,
    PrimarySourceTables
  >;
  // secondaryTable?: TableConnections<RowType, SecondarySourceTables>;
  otherTables: TableConnection<RowType, UnifiedTable, OtherSourceTables>[];
}
