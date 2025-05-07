import {
  guildData,
  guildFlyer,
  guildInventory,
  unifiedGuild,
  uniref,
} from "../db.schema";
import { db as DB } from "../db";
import { eq, isNull, type SQLWrapper, gt } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { chunk } from "./chunk";
import {
  insertMultipleHistoryRows,
  type InsertHistoryRowOptions,
} from "./history";
import { KV } from "./kv";

export function createUnifier<RowType, TableType extends UnifiedTables>({
  table,
  getRow,
  transform,
  connections,
  version,
}: {
  table: TableType;
  getRow: (id: number, db: typeof DB) => Promise<RowType>;
  transform: (
    item: RowType,
    t: typeof cellTransformer
  ) => {
    [K in keyof TableType["$inferSelect"]]: ReturnType<typeof cellTransformer>;
  };
  connections: Connections<RowType, TableType>;
  version: number;
}) {
  async function updateRow({
    id,
    insertHistory = true,
    db = DB,
  }: {
    id: number;
    insertHistory?: boolean;
    db?: typeof DB;
  }): Promise<{
    history: InsertHistoryRowOptions<TableType["$inferSelect"]>;
  }> {
    const item = await getRow(id, db);
    // 1. Check primary connections
    // 2. Check + make other connections
    // 3. Transform
    const transformed = transform(item, cellTransformer);
    // 4. Apply Overrides + Find Errors
    // 5. Update Row
    // 6. Update History
    // throw new Error("Not implemented");
    return {
      history: {} as any,
    };
  }

  async function updateUnifiedTable({
    db = DB,
    updateAll = false,
    progress,
  }: {
    db?: typeof DB;
    updateAll?: boolean;
    progress?: (progress: number) => void;
  }) {
    if (progress) progress(-1);
    const unifiedTableName = getTableConfig(table).name,
      kv = new KV("unifier/" + unifiedTableName, db),
      newLastUpdated = Date.now(),
      prevLastUpdated = parseInt((await kv.get("lastUpdated")) ?? "0"),
      rowsToUpdate = new Set<number>();
    if (parseInt((await kv.get("version")) ?? "-1") < version) {
      updateAll = true;
    }

    // 1. Add missing primary rows
    const missingPrimaryRows = await db
      .select()
      .from(connections.primaryTable.table)
      .leftJoin(
        table,
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
        .insert(table)
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

    // 2. Determine which rows need to be updated
    if (updateAll) {
      const allRows = await db.select({ id: table.id }).from(table).execute();
      allRows.forEach((v) => rowsToUpdate.add(v.id));
    } else {
      const sourceTables = [
        connections.primaryTable.table,
        ...connections.otherTables.map((v) => v.table),
      ];
      for (const sourceTable of sourceTables) {
        const rows = await db
          .select({ id: table.id })
          .from(table)
          .innerJoin(
            sourceTable,
            eq(
              table[connections.primaryTable.refCol] as SQLWrapper,
              sourceTable.id
            )
          )
          .where(gt(sourceTable.lastUpdated, prevLastUpdated));
        rows.forEach((r) => rowsToUpdate.add(r.id));
      }
    }
    // 3. Update Rows
    if (progress) progress(0);
    let done = 0;
    const historyToRecord: InsertHistoryRowOptions<
      TableType["$inferSelect"]
    >[] = [];
    for (const id of rowsToUpdate) {
      const { history } = await updateRow({ id, db, insertHistory: false });
      historyToRecord.push(history);
      done++;
      if (progress && done % 50 === 0) progress(done / rowsToUpdate.size);
    }
    if (progress) progress(1);

    // 4. Batch Update History
    for (const chunkedHistory of chunk(historyToRecord)) {
      await insertMultipleHistoryRows({
        db,
        resourceType: unifiedTableName as any,
        rows: chunkedHistory,
      });
    }
    // 5. Finish
    await kv.set("lastUpdated", newLastUpdated.toString());
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

type CellTransformerOptions<T> = {
  shouldMatch?: { name: string; val: T; ignore?: boolean };
  shouldNotBeNull?: boolean;
  neverNull?: boolean;
  isPrice?: boolean;
  isRef?: boolean;
};

const cellTransformer = <
  T extends UnifiedTables,
  K extends keyof T["$inferSelect"]
>(
  key: K,
  val: T["$inferSelect"][K],
  options?: CellTransformerOptions<T["$inferSelect"][K]>
) => {
  return {
    key,
    val,
    options,
  };
};

interface TableConnection<
  RowType,
  UnifiedTable extends UnifiedTables,
  T extends PrimarySourceTables | OtherSourceTables
> {
  table: T;
  refCol: keyof UnifiedTable;
  recheckConnectionsOnFieldChange: string[];
  findConnections: (row: RowType, db: typeof DB) => Promise<number[]>;
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
