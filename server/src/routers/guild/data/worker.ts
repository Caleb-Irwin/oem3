import { eq, gt } from "drizzle-orm";
import {
  enforceEnum,
  genDiffer,
  removeNaN,
} from "../../../utils/changeset.helpers";
import { work } from "../../../utils/workerBase";
import { guildData, guildUmEnum } from "./table";
import * as xlsx from "xlsx";
import { addOrSmartUpdateImage } from "../../../utils/images";
import { changesets } from "../../../db.schema";
import PromisePool from "@supercharge/promise-pool";

declare var self: Worker;

work({
  self,
  process: async ({
    db,
    message,
    progress,
    utils: { getFileDataUrl, createChangeset, notifier },
  }) => {
    const fileId = (message.data as { fileId: number }).fileId,
      startTime = Date.now(),
      changeset = await createChangeset(guildData, fileId),
      dataUrl = await getFileDataUrl(fileId),
      workbook = xlsx.read(dataUrl.slice(dataUrl.indexOf(";base64,") + 8)),
      worksheet = workbook.Sheets[workbook.SheetNames[0]],
      guildObjects = xlsx.utils.sheet_to_json(worksheet);

    await db.transaction(async (db) => {
      const prevItems = new Map(
        (await db.query.guildData.findMany({ with: { uniref: true } })).map(
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
        preventAutoFinish: true,
        fileId
      });
    });

    const allUpdated = await db.query.guildData.findMany({
      where: gt(guildData.lastUpdated, startTime - 1),
      columns: {
        gid: true,
      }
    });

    progress(-1);
    let doneSoFar = 0;
    const total = allUpdated.length;

    await PromisePool.withConcurrency(10)
      .for(allUpdated)
      .handleError(async (error, { gid }) => {
        console.error("Error adding image for gid", gid, error);
      })
      .onTaskFinished(() => {
        doneSoFar++;
        if (doneSoFar % 50 === 0) {
          progress(doneSoFar / total);
        }
      })
      .process(async ({ gid }) => {
        await addOrSmartUpdateImage(`https://shopofficeonline.com/ProductImages/${gid.replace(
          /[\W_]+/g,
          ""
        )}.jpg`, gid, "shopofficeonline");
      });

    await db
      .update(changesets)
      .set({ status: "completed" })
      .where(eq(changesets.id, changeset.id));
    notifier();
  },
});

const convertZeroToEmpty = (v: unknown) => {
  if (!v) return "";
  return typeof v !== "string" ? "" : v.trim();
};

const transformGuild = (g: GuildRaw): typeof guildData.$inferInsert => {
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
    webCategory1Desc: convertZeroToEmpty(g["Web Category 1 Descriptions"]),
    webCategory2Desc: convertZeroToEmpty(
      g["Web Category 2 'Sub' Descriptions"]
    ),
    webCategory3Desc: convertZeroToEmpty(
      g["Web Category 3 'Sub-Sub' Descriptions"]
    ),
    webCategory4Desc: convertZeroToEmpty(
      g["Web Category 4 'Sub-Sub-Sub' Descriptions"]
    ),
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
