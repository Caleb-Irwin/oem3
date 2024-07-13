import { and, desc, eq, lt } from "drizzle-orm";
import { db as DB } from "../db";
import {
  changesetStatusType,
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
      transform,
      getPrevious,
      diff,
      excludeFromHistory,
      progress,
    }: {
      db: typeof DB;
      rawItems: Raw[];
      transform: (raw: Raw) => ItemInsert;
      getPrevious: (current: ItemInsert) => Promise<Item | undefined>;
      diff: ReturnType<typeof genDiffer<Item, ItemInsert>>;
      excludeFromHistory?: (keyof ItemInsert)[];
      progress: (amountDone: number) => void;
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
            prev = await getPrevious(next);
          if (!prev) {
            const res = await db
              .insert(table)
              .values({
                ...(next as any),
                lastUpdated: timeStamp,
              })
              .returning({ id: table.id });
            const uniRes = await db
              .insert(uniref)
              .values({
                qb: res[0].id,
                resourceType: name,
              })
              .returning({ id: uniref.uniId });
            await insertHistory({
              db,
              resourceType: "qb",
              entryType: "create",
              uniref: uniRes[0].id,
              changeset: changeset.id,
              data: next,
              created: timeStamp,
              exclude: excludeFromHistory,
            });
            summary["create"]++;
          } else {
            const { diff: diffRes, type } = diff(prev, next);
            if (type === "nop") {
              await db
                .update(table)
                .set({ deleted: false, lastUpdated: timeStamp })
                .where(eq(table.id, prev.id));
              if (prev.deleted) {
                await insertHistory({
                  db,
                  resourceType: "qb",
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
                resourceType: "qb",
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

      const deletedItems = await db.query[name].findMany({
        where: and(lt(table.lastUpdated, timeStamp), eq(table.deleted, false)),
        with: {
          uniref: true,
        },
      });

      await PromisePool.withConcurrency(100)
        .for(deletedItems)
        .process(async (item) => {
          await db
            .update(table)
            .set({ lastUpdated: timeStamp, deleted: true })
            .where(eq(table.id, item.id));
          await insertHistory({
            db,
            resourceType: "qb",
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

      notifier();
    },
    setStatus: async (
      status: (typeof changesetStatusType.enumValues)[number]
    ) => {
      await DB.update(changesets)
        .set({ status })
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
