import { TRPCError } from "@trpc/server";
import { router } from "../../../trpc";
import { fileProcedures } from "../../../utils/files";
import { managedWorker } from "../../../utils/managedWorker";
import * as xlsx from "xlsx";

const { worker, hook, runWorker } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "sprPriceFile"
);

export const sprPriceFileHook = hook;

export const sprPriceFileRouter = router({
  worker,
  files: fileProcedures(
    "priceFile",
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
        sprPriceObjects = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      [
        "Current SPRC SKU",
        "ProductID",
        "Product Status",
        "Description",
        "UM",
        "UPC",
        "Cat. Page",
        "Net Price",
        "List Price",
      ].forEach((key) => {
        if (!(sprPriceObjects[0] as string[]).includes(key))
          throw new TRPCError({
            message: "Missing Column: " + key,
            code: "BAD_REQUEST",
          });
      });

      let valid = false;
      (sprPriceObjects[0] as string[]).forEach((key) => {
        if (key.includes("Dealer Net Price")) {
          valid = true;
        }
      });
      if (!valid)
        throw new TRPCError({
          message: "Missing Dealer Net Price Column",
          code: "BAD_REQUEST",
        });
    },
    runWorker
  ),
});
