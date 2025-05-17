import { db as DB, type Tx } from "../db";
import { history, type EntryType } from "./history.table";
import type { ResourceType } from "./uniref.table";

export interface InsertHistoryRowOptions<T extends object> {
  uniref: number;
  changeset?: number | undefined;
  entryType: EntryType;
  data?: Partial<T> | null;
  prev?: T;
  exclude?: (keyof T)[];
  created: number;
}

interface InsertHistoryParams<T extends object>
  extends InsertHistoryRowOptions<T> {
  db: typeof DB | Tx;
  resourceType: ResourceType;
}

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
}: InsertHistoryParams<T>) => {
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

export const insertMultipleHistoryRows = async <T extends object>({
  db = DB,
  resourceType,
  rows,
}: {
  db: typeof DB | Tx;
  resourceType: ResourceType;
  rows: InsertHistoryRowOptions<T>[];
}) => {
  await db.insert(history).values(
    rows.map(
      ({
        uniref,
        changeset = undefined,
        entryType,
        data,
        prev,
        exclude = [],
        created,
      }) => ({
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
      })
    )
  );
};
