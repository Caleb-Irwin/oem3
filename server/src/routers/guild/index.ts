import { TRPCError } from "@trpc/server";
import { router } from "../../trpc";
import { fileProcedures } from "../../utils/files";
import { managedWorker } from "../../utils/managedWorker";
import * as xlsx from "xlsx";
import { inventoryRouter } from "./inventory";
import { flyerRouter } from "./flyer";

const { worker, runWorker, hook } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "guild"
);
export const guildHook = hook;

export const guildRouter = router({
  inventory: inventoryRouter,
  flyer: flyerRouter,
  files: fileProcedures(
    "guild",
    async (dataUrl, fileType) => {
      if (
        fileType !==
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
        throw new TRPCError({
          message: "Invalid File Type (XLSX Only)",
          code: "BAD_REQUEST",
        });
      const workbook = xlsx.read(
          dataUrl.slice(dataUrl.indexOf(";base64,") + 8)
        ),
        worksheet = workbook.Sheets[workbook.SheetNames[0]],
        guildObjects = xlsx.utils.sheet_to_json(worksheet);
      [
        "Supplier  (Guild Vendor Name)",
        "Product Code (Guild Product #)",
        "UPC#",
        "SPR#",
        "Basics#",
        "CIS#",
        "ENglish Short Description",
        "FRench Short Description",
        "ENglish Long Description",
        "FRench Long Description",
        "ENglish Unit",
        "FRench Unit",
        "Freight Flag",
        "Shipping Weight",
        "Standard Pack Qty",
        "Master Pack Qty",
        "Retail Price Level",
        "Price Level 1",
        "Price Level 0",
        "Min. Qty Order",
        "Member Price",
        "Heavy Goods Chg_SK",
        "Dropship Price",
        "Date Changed",
        "Web Category",
        "Web Category 1 Descriptions",
        "Web Category 2 'Sub' Descriptions",
        "Web Category 3 'Sub-Sub' Descriptions",
        "Web Category 4 'Sub-Sub-Sub' Descriptions",
        "Image URL",
      ].forEach((key) => {
        if (!(key in (guildObjects[0] as object)))
          throw new TRPCError({
            message: "Missing Column: " + key,
            code: "BAD_REQUEST",
          });
      });
    },
    runWorker
  ),
  worker,
});
