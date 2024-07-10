import { db as DB } from "../db";
import { history, type EntryType } from "./history.table";
import type { ResourceType } from "./uniref.table";

export const insertHistory = async <T extends object>({
  db = DB,
  uniref,
  resourceType,
  changeset = undefined,
  entryType,
  data,
  prev,
  exclude = [],
  created,
}: {
  db: typeof DB;
  uniref: number;
  resourceType: ResourceType;
  changeset?: number | undefined;
  entryType: EntryType;
  data?: Partial<T> | null;
  prev?: T;
  exclude?: (keyof T)[];
  created: number;
}) => {
  await db.insert(history).values({
    uniref,
    resourceType,
    changeset,
    entryType,
    data:
      entryType === "create"
        ? JSON.stringify(data)
        : entryType === "update" && data
        ? JSON.stringify(
            Object.entries(data)
              .map(([key, newValue]): [string, any, any] => [
                key,
                //@ts-expect-error
                prev[key],
                newValue,
              ])
              .filter(([key]) => !exclude.includes(key as keyof T))
          )
        : null,
    created,
  });
};
