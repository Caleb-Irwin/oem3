import { work } from "../../utils/workerBase";
import Papa from "papaparse";
import { PromisePool } from "@supercharge/promise-pool";
import { qb } from "./table";
import { eq, sql } from "drizzle-orm";
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

    await PromisePool.withConcurrency(10)
      .for(res.data as QbItemRaw[])
      .onTaskFinished(() => {
        i++;
        if (i % 500 === 0) incrementProgress(500);
      })
      .process(async (item) => {
        if (item.Type !== "Inventory Part") return;
        const prev = await getQBItem.execute({ qbId: item.Item });
        if (!prev)
          changeset.add({ type: "create", data: JSON.stringify(item), db });
        else changeset.add({ type: "nop", db });
      });
  }
);

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
