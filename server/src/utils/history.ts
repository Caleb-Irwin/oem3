import { db as DB } from "../db";
import { history, type EntryType } from "./history.table";

export const insertHistory = async <T extends object>({
  db = DB,
  uniref,
  entryType,
  data,
  prev,
  created,
}: {
  db: typeof DB;
  uniref: number;
  entryType: EntryType;
  data?: Partial<T> | null;
  prev?: T;
  created: number;
}) => {
  await db.insert(history).values({
    uniref,
    entryType,
    data:
      entryType === "create"
        ? JSON.stringify(data)
        : entryType === "update" && data
        ? JSON.stringify(
            Object.entries(data).map(([key, newValue]) => [
              key,
              //@ts-expect-error
              prev[key],
              newValue,
            ])
          )
        : null,
    created,
  });
};
