import { TRPCError } from "@trpc/server";
import { router } from "../../../trpc";
import { fileProcedures } from "../../../utils/files";
import { managedWorker } from "../../../utils/managedWorker";
import * as xlsx from "xlsx";
import { ensureSheetCols } from "../../../utils/ensureSheetCols";

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

      const headers = ensureSheetCols(
        xlsx.read(
          dataUrl.slice(dataUrl.indexOf(";base64,") + 8)
        ),
        [
          "SPRC SKU",
          "ProductID",
          "Product Status",
          "Description",
          "UoM",
          "UPC",
          "Cat. Page",
          "Net Price",
          "List Price",
        ]);

      let valid = false;
      (headers).forEach((key) => {
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
