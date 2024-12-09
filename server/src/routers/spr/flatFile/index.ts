import { TRPCError } from "@trpc/server";
import { router } from "../../../trpc";
import { fileProcedures } from "../../../utils/files";
import { managedWorker } from "../../../utils/managedWorker";

const { worker, hook, runWorker } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "sprFlatFile"
);

export const sprFlatFileHook = hook;

export const sprFlatFileRouter = router({
  worker,
  files: fileProcedures(
    "flatFile",
    async (fileDataUrl, fileType) => {
      if (fileType !== "text/csv")
        throw new TRPCError({
          message: "Invalid File Type (CSV Only)",
          code: "BAD_REQUEST",
        });

      const csvStart = atob(
          fileDataUrl.slice(fileDataUrl.indexOf(";base64,") + 8)
        ).slice(0, 1000),
        headers = csvStart.split("\n")[0].replaceAll(/"/g, "").split(",");

      [
        "ProductId",
        "SKU Type",
        "SKU",
        "LocaleId",
        "Catalog Sku",
        "Brand Name",
        "Product Type",
        "Product Line",
        "Product Series",
        "Desc1",
        "Desc2",
        "Desc3",
        "Marketing Text / Sales Copy",
        "Sub Class Number",
        "Sub Class Name",
        "Class Number",
        "Class Name",
        "Department Number",
        "Department Name",
        "Master Department Number",
        "Master Department Name",
        "UNSPSC",
        "keywords",
        "Manufacturer ID",
        "Manufacturer Name",
        "Product Specifications",
        "Country Of Origin",
        "Recycled",
        "Recycled PCW",
        "Recycled Total",
        "Assembly Required",
        "Image Type 225",
        "Image Type 75",
      ].forEach((key) => {
        if (!headers.includes(key))
          throw new TRPCError({
            message: "Missing Column: " + key,
            code: "BAD_REQUEST",
          });
      });
    },
    runWorker
    // , async () => {
    // },
    // true
  ),
});
