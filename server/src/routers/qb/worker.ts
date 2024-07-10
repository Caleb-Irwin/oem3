import { work } from "../../utils/workerBase";
import Papa from "papaparse";
import { PromisePool } from "@supercharge/promise-pool";
import { qb, qbItemTypeEnum, qbUmEnum, taxCodeEnum } from "./table";
import { eq, lt, sql } from "drizzle-orm";
declare var self: Worker;

work(
  self,
  "qb",
  async ({ fileBlob }) => {
    return atob(fileBlob.slice(fileBlob.indexOf("base64,") + 7)).split("\n")
      .length;
  },
  async ({ incrementProgress, fileBlob, changeset, db }) => {
    const res = Papa.parse(
      atob(fileBlob.slice(fileBlob.indexOf("base64,") + 7)),
      { header: true }
    );

    const getQBItem = db.query.qb
      .findFirst({ where: eq(qb.qbId, sql.placeholder("qbId")) })
      .prepare("qb-item");

    let taskCount = 0;
    changeset.start(db, qb);

    await PromisePool.withConcurrency(100)
      .for(res.data as QbItemRaw[])
      .onTaskFinished(() => {
        taskCount++;
        if (taskCount % 500 === 0) incrementProgress(500);
      })
      .process(async (item) => {
        if (item.Type !== "Inventory Part") return;
        const prev = await getQBItem.execute({ qbId: item.Item }),
          next = transformQBItem(item);
        if (!prev)
          await changeset.change({
            type: "create",
            id: null,
            data: next,
          });
        else {
          const { diff, type } = diffQBItems(prev, next);
          if (type === "nop")
            await changeset.change({ type: "nop", id: prev.id });
          else if (type === "inventory")
            await changeset.change({
              type: "inventoryUpdate",
              id: prev.id,
              data: diff,
            });
          else
            await changeset.change({
              type: "update",
              id: prev.id,
              data: diff,
            });
        }
      });

    const deletedItems = await db.query.qb.findMany({
      where: lt(qb.lastUpdated, changeset.time),
    });
    await PromisePool.withConcurrency(100)
      .for(deletedItems)
      .process(async (item) => {
        await changeset.change({ type: "delete", id: item.id });
      });

    await changeset.done();
  }
);

const transformQBItem = (item: QbItemRaw): typeof qb.$inferInsert => {
  return {
    qbId: item.Item,
    desc: item.Description,
    type: item.Type as (typeof qbItemTypeEnum.enumValues)[number],
    costCents: removeNaN(Math.round(100 * parseFloat(item.Cost) || -1)) ?? -1,
    priceCents: removeNaN(Math.round(100 * parseFloat(item.Price) || -1)) ?? -1,
    salesTaxCode: enforceEnum(item["Sales Tax Code"], taxCodeEnum.enumValues),
    purchaseTaxCode: enforceEnum(
      item["Purchase Tax Code"],
      taxCodeEnum.enumValues
    ),
    quantityOnSalesOrder: removeNaN(
      parseInt(item["Quantity On Sales Order"], 10)
    ),
    quantityOnPurchaseOrder: removeNaN(
      parseInt(item["Quantity On Purchase Order"], 10)
    ),
    um: getUM(item["U/M"]),
    account: item.Account,
    quantityOnHand: removeNaN(parseInt(item["Quantity On Hand"], 10)),
    preferredVendor: item["Preferred Vendor"],
    lastUpdated: 0,
  };
};

const getUM = (umStr: string): (typeof qbUmEnum.enumValues)[number] | null => {
  const um = umStr.toLowerCase();
  if (um.includes("ea")) return "ea";
  if (um.includes("pk")) return "pk";
  if (um.includes("cs")) return "cs";
  return null;
};

const removeNaN = (num: number) => (isNaN(num) ? null : num);

const enforceEnum = <T extends string[]>(
  str: string,
  values: T
): T[number] | null => {
  if (!values.includes(str)) return null;
  return str;
};

const diffQBItems = (
  prev: typeof qb.$inferSelect,
  next: typeof qb.$inferInsert
): {
  diff: Partial<typeof qb.$inferInsert>;
  type: "nop" | "inventory" | "more";
} => {
  const diff: Partial<typeof qb.$inferInsert> = {};
  let type: "nop" | "inventory" | "more" = "nop";
  if (prev.quantityOnHand !== next.quantityOnHand) {
    diff.quantityOnHand = next.quantityOnHand;
    type = "inventory";
  }
  (
    [
      "desc",
      "type",
      "costCents",
      "priceCents",
      "salesTaxCode",
      "purchaseTaxCode",
      "quantityOnSalesOrder",
      "quantityOnPurchaseOrder",
      "um",
      "account",
      "preferredVendor",
    ] as (keyof typeof qb.$inferInsert)[]
  ).forEach((key) => {
    if (prev[key] !== next[key]) {
      diff[key] = next[key] as any;
      type = "more";
    }
  });
  return {
    type,
    diff,
  };
};

export interface QbItemRaw {
  Item: string;
  Description: string;
  Type: string;
  Cost: string;
  Price: string;
  "Sales Tax Code": string;
  "Purchase Tax Code": string;
  "Quantity On Sales Order": string;
  "Reorder Pt (Min)": string;
  "Quantity On Purchase Order": string;
  "U/M Set": string;
  Account: string;
  "Quantity On Hand": string;
  "U/M": string;
  "Preferred Vendor": string;
}
