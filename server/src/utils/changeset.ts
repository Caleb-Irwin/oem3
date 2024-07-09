import { desc, eq } from "drizzle-orm";
import { db, type db as dbType } from "../db";
import {
  changeType,
  changes,
  changesetStatusType,
  changesetType,
  changesets,
} from "./changeset.table";

export const createChangeset = async (
  type: (typeof changesetType.enumValues)[number],
  file: number,
  notifier: () => void
) => {
  const changeset = (
    await db
      .insert(changesets)
      .values({ type, file, created: Date.now(), status: "generating" })
      .returning()
  )[0];
  notifier();

  return {
    add: async ({
      db,
      uniref,
      type,
      data,
    }: {
      db: typeof dbType;
      uniref?: number | null;
      type: (typeof changeType.enumValues)[number];
      data?: string | null;
    }) => {
      await db.insert(changes).values({
        set: changeset.id,
        uniref,
        type,
        data,
        created: Date.now(),
      });
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
