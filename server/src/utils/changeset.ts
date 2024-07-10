import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  changeType,
  changesetStatusType,
  changesetType,
  changesets,
} from "./changeset.table";
import type { qb } from "../db.schema";

export const createChangeset = async (
  type: (typeof changesetType.enumValues)[number],
  file: number,
  notifier: () => void
) => {
  const timeStamp = Date.now(),
    changeset = (
      await db
        .insert(changesets)
        .values({ type, file, created: timeStamp, status: "generating" })
        .returning()
    )[0];
  notifier();

  const summary = {
    nop: 0,
    inventoryUpdate: 0,
    update: 0,
    create: 0,
    delete: 0,
  };

  let trxDb: typeof db, table: typeof qb;

  return {
    id: changeset.id,
    time: timeStamp,
    start: async (trx: typeof trxDb, tableToModify: typeof table) => {
      trxDb = trx;
      table = tableToModify;
    },
    change: async ({
      id,
      type,
      data,
    }: {
      id: number | null;
      type: (typeof changeType.enumValues)[number];
      data?: Partial<typeof table.$inferInsert> | null;
    }) => {
      summary[type]++;
      if (type === "nop" && id) {
        await trxDb
          .update(table)
          .set({ deleted: false, lastUpdated: timeStamp })
          .where(eq(table.id, id));
      } else if (type === "inventoryUpdate" && id) {
        await trxDb
          .update(table)
          .set({ ...data, deleted: false, lastUpdated: timeStamp })
          .where(eq(table.id, id));
      } else if (type === "update" && id) {
        await trxDb
          .update(table)
          .set({ ...data, deleted: false, lastUpdated: timeStamp })
          .where(eq(table.id, id));
      } else if (type === "create") {
        await trxDb
          .insert(table)
          .values({
            ...(data as typeof table.$inferInsert),
            lastUpdated: timeStamp,
          });
      } else if (type === "delete" && id) {
        await trxDb
          .update(table)
          .set({ lastUpdated: timeStamp, deleted: true })
          .where(eq(table.id, id));
      } else {
        console.log("Invalid change type", type, id);
        throw new Error("Invalid change type");
      }
    },
    done: async () => {
      await db
        .update(changesets)
        .set({ summary: JSON.stringify(summary) })
        .where(eq(changesets.id, changeset.id));
      notifier();
    },
    setStatus: async (
      status: (typeof changesetStatusType.enumValues)[number]
    ) => {
      await db
        .update(changesets)
        .set({ status })
        .where(eq(changesets.id, changeset.id));
      notifier();
    },
  };
};

export const getChangeset = async (
  type: (typeof changesetType.enumValues)[number]
) => {
  return await db.query.changesets.findFirst({
    where: eq(changesets.type, type),
    orderBy: desc(changesets.created),
  });
};
