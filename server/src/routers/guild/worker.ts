import { enforceEnum, removeNaN } from "../../utils/changeset.helpers";
import { work } from "../../utils/workerBase";
import { guildUmEnum, type guild } from "./table";

declare var self: Worker;

work({
  self,
  process: async ({}) => {
    console.log("TODO Implement Guild Worker");
  },
});

const transformGuild = (g: GuildRaw): typeof guild.$inferInsert => {
  return {
    gid: g["Product Code (Guild Product #)"].trim(),
    upc: (g["UPC#"] ?? "").trim(),
    spr: (g["SPR#"] ?? "").trim(),
    basics: (g["Basics#"] ?? "").trim(),
    cis: (g["CIS#"] ?? "").trim(),
    priceL0Cents:
      removeNaN(
        Math.round(parseFloat(g["Price Level 0"] as string) * 100 || -1)
      ) ?? -1,
    priceL1Cents:
      removeNaN(
        Math.round(parseFloat(g["Price Level 1"] as string) * 100 || -1)
      ) ?? -1,
    priceRetailCents:
      removeNaN(
        Math.round(parseFloat(g["Retail Price Level"] as string) * 100 || -1)
      ) ?? -1,
    memberPriceCents:
      removeNaN(
        Math.round(parseFloat(g["Member Price"] as string) * 100 || -1)
      ) ?? -1,
    dropshipPriceCents:
      removeNaN(
        Math.round(parseFloat(g["Dropship Price"] as string) * 100 || -1)
      ) ?? -1,
    shortDesc: (g["ENglish Short Description"] ?? "").trim(),
    longDesc: (g["ENglish Long Description"] ?? "").trim(),
    imageURL: (g["Image URL"] ?? "").trim(),
    vendor: (g["Supplier  (Guild Vendor Name)"] ?? "").trim(),
    webCategory: removeNaN(parseInt(g["Web Category"] as string)) ?? -1,
    webCategory1Desc: (g["Web Category 1 Descriptions"] ?? "").trim(),
    webCategory2Desc: (g["Web Category 2 'Sub' Descriptions"] ?? "").trim(),
    webCategory3Desc: (g["Web Category 3 'Sub-Sub' Descriptions"] ?? "").trim(),
    webCategory4Desc: (
      g["Web Category 4 'Sub-Sub-Sub' Descriptions"] ?? ""
    ).trim(),
    um: enforceEnum(
      (g["ENglish Unit"] ?? "").toLowerCase(),
      guildUmEnum.enumValues
    ),
    standardPackQty:
      removeNaN(parseInt(g["Standard Pack Qty"] as string)) ?? -1,
    masterPackQty: removeNaN(parseInt(g["Master Pack Qty"] as string)) ?? -1,
    freightFlag: (g["Freight Flag"]?.trim() ?? "") === "F",
    weightGrams:
      removeNaN(
        Math.ceil(parseFloat(g["Shipping Weight"] as string) * 453.592)
      ) || -1,
    heavyGoodsChargeSkCents:
      removeNaN(
        Math.round(parseFloat(g["Heavy Goods Chg_SK"] as string) * 100)
      ) ?? 0,
    minOrderQty: parseInt(g["Min. Qty Order"] as string) || -1,
    guildDateChanged: new Date(
      Date.UTC(0, 0, parseInt(g["Date Changed"] as string) - 1)
    ).valueOf(),
    lastUpdated: 0,
  };
};

interface GuildRaw {
  "Supplier  (Guild Vendor Name)": string;
  "Product Code (Guild Product #)": string;
  "UPC#": string;
  "SPR#": string;
  "Basics#": string;
  "CIS#": string;
  "ENglish Short Description": string;
  "FRench Short Description": string;
  "ENglish Long Description": string;
  "FRench Long Description": string;
  "ENglish Unit": string;
  "FRench Unit": string;
  "Freight Flag": string;
  "Shipping Weight": number | unknown;
  "Standard Pack Qty": number | unknown;
  "Master Pack Qty": number | unknown;
  "Retail Price Level": number | unknown;
  "Price Level 1": number | unknown;
  "Price Level 0": number | unknown;
  "Min. Qty Order": number | unknown;
  "Member Price": number | unknown;
  "Heavy Goods Chg_SK": number | unknown;
  "Dropship Price": number | unknown;
  "Date Changed": number | unknown;
  "Web Category": number | unknown;
  "Web Category 1 Descriptions": string;
  "Web Category 2 'Sub' Descriptions": string;
  "Web Category 3 'Sub-Sub' Descriptions": string;
  "Web Category 4 'Sub-Sub-Sub' Descriptions": string;
  "Image URL": string;
}
