import { genDiffer, removeNaN } from "../../../utils/changeset.helpers";
import { work } from "../../../utils/workerBase";
import { guildFlyer } from "./table";
import * as xlsx from "xlsx";

work({
  process: async ({
    db,
    message,
    progress,
    utils: { getFileDataUrl, createChangeset },
  }) => {
    const fileId = (message as { fileId: number }).fileId,
      changeset = await createChangeset(guildFlyer, fileId),
      dataUrl = await getFileDataUrl(fileId),
      workbook = xlsx.read(dataUrl.slice(dataUrl.indexOf(";base64,") + 8)),
      worksheet = workbook.Sheets[workbook.SheetNames[0]],
      flyerObjects = xlsx.utils.sheet_to_json(worksheet);

    await db.transaction(async (db) => {
      const prevItems = new Map(
        (await db.query.guildFlyer.findMany({ with: { uniref: true } })).map(
          (item) => [item.gid, item]
        )
      );
      await changeset.process({
        db,
        rawItems: flyerObjects as GuildFlyerRaw[],
        prevItems,
        transform: transformGuildFlyer,
        extractId: (g) => g.gid,
        diff: genDiffer(
          [],
          [
            "gid",
            "flyerNumber",
            "startDate",
            "endDate",
            "vendorCode",
            "flyerCostCents",
            "flyerPriceL0Cents",
            "flyerPriceL1Cents",
            "flyerPriceRetailCents",
            "regularPriceL0Cents",
            "regularPriceL1Cents",
          ]
        ),
        progress,
        fileId,
      });
    });
  },
});

function transformGuildFlyer(g: GuildFlyerRaw): typeof guildFlyer.$inferInsert {
  return {
    gid: g["Item Stock #"].toString(),
    flyerNumber: removeNaN(parseInt(g["Flyer # "])),
    startDate: new Date(g["Date Flyer Starts "] + ": GMT-0600").valueOf(),
    endDate: new Date(g["Date Flyer Ends"] + ": GMT-0600").valueOf(),
    vendorCode: g["Manufacture's Code"],
    flyerCostCents: removeNaN(Math.round(parseFloat(g["Flyer Cost"]) * 100)),
    flyerPriceL0Cents: removeNaN(
      Math.round(parseFloat(g["Flyer Price Level 0"]) * 100)
    ),
    flyerPriceL1Cents: removeNaN(
      Math.round(parseFloat(g["Flyer Price Level 1"]) * 100)
    ),
    flyerPriceRetailCents: removeNaN(
      Math.round(parseFloat(g["Flyer Price Retail Level"]) * 100)
    ),
    regularPriceL0Cents: removeNaN(
      Math.round(parseFloat(g["Regular Price Level 0"]) * 100)
    ),
    regularPriceL1Cents: removeNaN(
      Math.round(parseFloat(g["Regular Price Level 1"]) * 100)
    ),
    lastUpdated: 0,
  };
}
export interface GuildFlyerRaw {
  "Flyer # ": string;
  "Date Flyer Starts ": string;
  "Date Flyer Ends": string;
  "Manufacture's Code": string;
  "Item Stock #": string;
  "Flyer Cost": string;
  "Flyer Price Level 0": string;
  "Flyer Price Level 1": string;
  "Flyer Price Retail Level": string;
  "Regular Price Level 0": string;
  "Regular Price Level 1": string;
}
