import {
  enforceEnum,
  genDiffer,
  removeNaN,
} from "../../utils/changeset.helpers";
import { work } from "../../utils/workerBase";
import { guild, guildUmEnum } from "./table";
import * as xlsx from "xlsx";

declare var self: Worker;

work({
  self,
  process: async ({
    db,
    message,
    progress,
    utils: { getFileBlob, createChangeset },
  }) => {
    const fileId = (message.data as { fileId: number }).fileId,
      changeset = await createChangeset(guild, fileId),
      blob = await getFileBlob(fileId),
      workbook = xlsx.read(blob.slice(blob.indexOf(";base64,") + 8)),
      worksheet = workbook.Sheets[workbook.SheetNames[0]],
      guildObjects = xlsx.utils.sheet_to_json(worksheet);

    await db.transaction(async (db) => {
      const prevItems = new Map(
        (await db.query.guild.findMany({ with: { uniref: true } })).map(
          (item) => [item.gid, item]
        )
      );
      await changeset.process({
        db,
        rawItems: guildObjects as GuildRaw[],
        prevItems,
        transform: transformGuild,
        extractId: (g) => g.gid,
        diff: genDiffer(
          [],
          [
            "gid",
            "upc",
            "spr",
            "basics",
            "cis",
            "priceL0Cents",
            "priceL1Cents",
            "priceRetailCents",
            "memberPriceCents",
            "dropshipPriceCents",
            "shortDesc",
            "longDesc",
            "imageURL",
            "vendor",
            "webCategory",
            "webCategory1Desc",
            "webCategory2Desc",
            "webCategory3Desc",
            "webCategory4Desc",
            "um",
            "standardPackQty",
            "masterPackQty",
            "freightFlag",
            "weightGrams",
            "heavyGoodsChargeSkCents",
            "minOrderQty",
            "guildDateChanged",
          ]
        ),
        excludeFromHistory: [],
        progress,
      });
    });
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