import { desc, eq } from "drizzle-orm";
import { db as DB } from "../db";
import {
  changesetType,
  changesets,
  type ChangesetTable,
  type ChangesetType,
} from "./changeset.table";
import PromisePool from "@supercharge/promise-pool";
import { getTableConfig } from "drizzle-orm/pg-core";
import type { genDiffer } from "./changeset.helpers";
import { uniref } from "./uniref.table";
import { insertHistory } from "./history";

export const createChangeset = async (
  table: ChangesetTable,
  file: number,
  notifier: () => void
) => {
  const name = getTableConfig(table).name as ChangesetType;

  const timeStamp = Date.now(),
    changeset = (
      await DB.insert(changesets)
        .values({
          type: name,
          file,
          created: timeStamp,
          status: "generating",
        })
        .returning()
    )[0],
    { uniId } = (
      await DB.insert(uniref)
        .values({
          resourceType: "changeset",
          changeset: changeset.id,
        })
        .returning({ uniId: uniref.uniId })
    )[0];
  notifier();

  const summary = {
    nop: 0,
    inventoryUpdate: 0,
    update: 0,
    create: 0,
    delete: 0,
  };

  return {
    id: changeset.id,
    time: timeStamp,
    process: async <
      Raw extends object,
      ItemInsert extends object,
      Item extends {
        id: number;
        uniref: { uniId: number };
        deleted: boolean;
      } & ItemInsert
    >({
      db,
      rawItems,
      prevItems,
      transform,
      extractId,
      diff,
      excludeFromHistory,
      progress,
      customDeletedItems = undefined,
    }: {
      db: typeof DB;
      rawItems: Raw[];
      prevItems: Map<number | string, Item>;
      transform: (raw: Raw) => ItemInsert;
      extractId: (current: ItemInsert) => number | string;
      diff: ReturnType<typeof genDiffer<Item, ItemInsert>>;
      excludeFromHistory?: (keyof ItemInsert)[];
      progress: (amountDone: number) => void;
      customDeletedItems?: Item[] | undefined;
    }) => {
      const total = rawItems.length;
      let taskCount = 0;
      await PromisePool.withConcurrency(100)
        .for(rawItems)
        .onTaskFinished(() => {
          taskCount++;
          if (taskCount % 500 === 0) progress(taskCount / total);
        })
        .process(async (raw) => {
          const next = transform(raw),
            prevId = extractId(next),
            prev = prevItems.get(prevId);

          if (!prev) {
            const res = await db
              .insert(table)
              .values({
                ...(next as any),
                lastUpdated: timeStamp,
              })
              .returning({ id: table.id });
            const uniResObj: typeof uniref.$inferInsert = {
              resourceType: name,
            };
            uniResObj[name] = res[0].id;
            const uniRes = await db
              .insert(uniref)
              .values(uniResObj)
              .returning({ id: uniref.uniId });
            await insertHistory({
              db,
              resourceType: name,
              entryType: "create",
              uniref: uniRes[0].id,
              changeset: changeset.id,
              data: next,
              created: timeStamp,
              exclude: excludeFromHistory,
            });
            summary["create"]++;
          } else {
            prevItems.delete(prevId);
            const { diff: diffRes, type } = diff(prev, next);
            if (type === "nop") {
              if (prev.deleted) {
                await db
                  .update(table)
                  .set({ deleted: false, lastUpdated: timeStamp })
                  .where(eq(table.id, prev.id));
                await insertHistory({
                  db,
                  resourceType: name,
                  entryType: "update",
                  uniref: prev.uniref.uniId,
                  changeset: changeset.id,
                  data: { deleted: false } as Partial<Item>,
                  prev: prev,
                  exclude: excludeFromHistory,
                  created: timeStamp,
                });
                summary["update"]++;
              } else summary["nop"]++;
            } else if (type === "inventory") {
              await db
                .update(table)
                .set({ ...diffRes, deleted: false, lastUpdated: timeStamp })
                .where(eq(table.id, prev.id));
              summary["inventoryUpdate"]++;
            } else {
              await db
                .update(table)
                .set({ ...diffRes, deleted: false, lastUpdated: timeStamp })
                .where(eq(table.id, prev.id));
              await insertHistory({
                db,
                resourceType: name,
                entryType: "update",
                uniref: prev.uniref.uniId,
                changeset: changeset.id,
                data: diffRes,
                prev: prev,
                exclude: excludeFromHistory,
                created: timeStamp,
              });
              summary["update"]++;
            }
          }
        });

      const deletedItems = customDeletedItems
        ? customDeletedItems
        : Array.from(prevItems.values()).filter((v) => !v.deleted);

      await PromisePool.withConcurrency(100)
        .for(deletedItems)
        .process(async (item) => {
          await db
            .update(table)
            .set({ lastUpdated: timeStamp, deleted: true })
            .where(eq(table.id, item.id));
          await insertHistory({
            db,
            resourceType: name,
            entryType: "delete",
            uniref: item.uniref.uniId,
            changeset: changeset.id,
            created: timeStamp,
          });
          summary["delete"]++;
        });

      await db
        .update(changesets)
        .set({ summary: JSON.stringify(summary) })
        .where(eq(changesets.id, changeset.id));
      await insertHistory({
        db,
        resourceType: "changeset",
        uniref: uniId,
        changeset: changeset.id,
        created: timeStamp,
        entryType: "create",
        data: summary,
      });
      await db
        .update(changesets)
        .set({ status: "completed" })
        .where(eq(changesets.id, changeset.id));
      notifier();
    },
  };
};

export const getChangeset = async (
  type: (typeof changesetType.enumValues)[number]
) => {
  return await DB.query.changesets.findFirst({
    where: eq(changesets.type, type),
    orderBy: desc(changesets.created),
  });
};
