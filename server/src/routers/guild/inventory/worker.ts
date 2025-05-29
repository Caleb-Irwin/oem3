import {
  enforceEnum,
  genDiffer,
  removeNaN,
} from "../../../utils/changeset.helpers";
import { work } from "../../../utils/workerBase";
import { guildUmEnum } from "../data/table";
import { guildInventory } from "./table";
import Papa from "papaparse";

declare var self: Worker;

work({
  self,
  process: async ({
    db,
    message,
    progress,
    utils: { getFileDataUrl, createChangeset },
  }) => {
    const fileId = (message.data as { fileId: number }).fileId,
      changeset = await createChangeset(guildInventory, fileId),
      dataUrl = await getFileDataUrl(fileId),
      res = Papa.parse(
        atob(dataUrl.slice(dataUrl.indexOf("base64,") + 7)).replace("ï»¿", ""),
        {
          header: true,
        }
      );

    await db.transaction(async (db) => {
      const prevItems = new Map(
        (
          await db.query.guildInventory.findMany({ with: { uniref: true } })
        ).map((item) => [item.gid, item])
      );

      await changeset.process({
        db,
        rawItems: (res.data as GuildInventoryRaw[]).filter(
          (item) => (item.SKU.length ?? "") > 0
        ),
        prevItems,
        transform: transformGuildInventory,
        extractId: (item) => item.gid,
        diff: genDiffer(
          ["onHand"],
          [
            "gid",
            "onHand",
            "sku",
            "upc",
            "spr",
            "basics",
            "cis",
            "um",
            "qtyPerUm",
          ]
        ),
        progress,
        fileId
      });
    });
  },
});

function transformGuildInventory(
  item: GuildInventoryRaw
): typeof guildInventory.$inferInsert {
  return {
    gid: item["Product#"].trim(),
    onHand: removeNaN(parseInt(item["Qty On Hand"])),
    sku: item.SKU,
    upc: item["UPC#"] == "0" ? null : item["UPC#"],
    spr: item["SPR#"],
    basics: item["Basics#"],
    cis: item["CIS#"],
    um: enforceEnum(
      item["Unit of Measure"].toLowerCase(),
      guildUmEnum.enumValues
    ),
    qtyPerUm: removeNaN(parseInt(item["Qty/UoM"])),
    lastUpdated: 0,
  };
}

export interface GuildInventoryRaw {
  SKU: string;
  "Qty On Hand": string;
  "Product#": string;
  "UPC#": string;
  "SPR#": string;
  "Basics#": string;
  "CIS#": string;
  "Qty/UoM": string;
  "Unit of Measure": string;
}
