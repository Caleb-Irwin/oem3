import { work } from "../../utils/workerBase";
import Papa from "papaparse";
import { PromisePool } from "@supercharge/promise-pool";
import { qb, qbItemTypeEnum, qbUmEnum, taxCodeEnum } from "./table";
import { eq, sql } from "drizzle-orm";
import { changes } from "../../db.schema";
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

    let i = 0;

    await PromisePool.withConcurrency(100)
      .for(res.data as QbItemRaw[])
      .onTaskFinished(() => {
        i++;
        if (i % 500 === 0) incrementProgress(500);
      })
      .process(async (item) => {
        if (item.Type !== "Inventory Part") return;
        const prev = await getQBItem.execute({ qbId: item.Item }),
          next = transformQBItem(item);
        if (!prev)
          await changeset.add({
            type: "create",
            data: JSON.stringify(next),
            db,
          });
        else {
          const { diff, type } = diffQBItems(prev, next);
          if (type === "nop")
            await changeset.add({ type: "nop", uniref: prev.id, db });
          else if (type === "inventory")
            await changeset.add({
              type: "inventoryUpdate",
              data: JSON.stringify(diff),
              uniref: prev.id,
              db,
            });
          else
            await changeset.add({
              type: "update",
              data: JSON.stringify(diff),
              uniref: prev.id,
              db,
            });
        }
      });

    // db.select({ id: qb.id })
    //   .from(qb)
    //   .leftJoin(changes, eq(changes.uniref, qb.id));

    await changeset.setSummary(
      await db
        .select({
          type: changes.type,
          count: sql<number>`count(${changes.id})`,
        })
        .from(changes)
        .groupBy(changes.type)
        .where(eq(changes.set, changeset.id))
    );
  }
);

const transformQBItem = (item: QbItemRaw): typeof qb.$inferInsert => {
  return {
    qbId: item.Item,
    desc: item.Description,
    type: item.Type as (typeof qbItemTypeEnum.enumValues)[number],
    costCents: Math.round(100 * parseFloat(item.Cost) || -1),
    priceCents: Math.round(100 * parseFloat(item.Price) || -1),
    salesTaxCode: item[
      "Sales Tax Code"
    ] as (typeof taxCodeEnum.enumValues)[number],
    purchaseTaxCode: item[
      "Purchase Tax Code"
    ] as (typeof taxCodeEnum.enumValues)[number],
    quantityOnSalesOrder: parseInt(item["Quantity On Sales Order"], 10),
    quantityOnPurchaseOrder: parseInt(item["Quantity On Purchase Order"], 10),
    um: getUM(item["U/M"]),
    account: item.Account,
    quantityOnHand: parseInt(item["Quantity On Hand"], 10),
    preferredVendor: item["Preferred Vendor"],
    lastUpdated: 0,
  };
};

const getUM = (
  umStr: string
): (typeof qbUmEnum.enumValues)[number] | undefined => {
  const um = umStr.toLowerCase();
  if (um.includes("ea")) return "ea";
  if (um.includes("pk")) return "pk";
  if (um.includes("cs")) return "cs";
  return undefined;
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
      "quantityOnHand",
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
