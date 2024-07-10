import { work } from "../../utils/workerBase";
import Papa from "papaparse";
import { qb, qbItemTypeEnum, qbUmEnum, taxCodeEnum } from "./table";
import { eq, sql } from "drizzle-orm";
import {
  enforceEnum,
  genDiffer,
  removeNaN,
} from "../../utils/changeset.helpers";
declare var self: Worker;

work(
  self,
  qb,
  async () => {
    return;
  },
  async ({ fileBlob, changeset, progress, db }) => {
    const res = Papa.parse(
      atob(fileBlob.slice(fileBlob.indexOf("base64,") + 7)),
      { header: true }
    );

    const getQBItem = db.query.qb
      .findFirst({
        where: eq(qb.qbId, sql.placeholder("qbId")),
        with: {
          uniref: true,
        },
      })
      .prepare("qb-item");

    await changeset.process<
      QbItemRaw,
      typeof qb.$inferInsert,
      Exclude<Awaited<ReturnType<typeof getQBItem.execute>>, undefined>
    >({
      db,
      rawItems: (res.data as QbItemRaw[]).filter(
        (item) => item.Type === "Inventory Part"
      ),
      transform: transformQBItem,
      getPrevious: async (item) => {
        return await getQBItem.execute({ qbId: item.qbId });
      },
      diff: genDiffer(
        ["quantityOnHand", "quantityOnPurchaseOrder", "quantityOnSalesOrder"],
        [
          "desc",
          "type",
          "costCents",
          "priceCents",
          "salesTaxCode",
          "purchaseTaxCode",
          "quantityOnHand",
          "quantityOnSalesOrder",
          "quantityOnPurchaseOrder",
          "um",
          "account",
          "preferredVendor",
        ]
      ),
      progress,
    });
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
