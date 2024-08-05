import { TRPCError } from "@trpc/server";
import { router } from "../../../trpc";
import { fileProcedures } from "../../../utils/files";
import { managedWorker } from "../../../utils/managedWorker";

const { worker, runWorker, hook } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "guildInventory"
);

export const guildInventoryHook = hook;

export const inventoryRouter = router({
  ...fileProcedures(
    "guildInventory",
    async (blob, fileType) => {
      if (fileType !== "text/csv")
        throw new Error("Invalid File Type (CSV Only)");

      const csvStart = atob(blob.slice(blob.indexOf(";base64,") + 8)).slice(
          0,
          1000
        ),
        headers = csvStart
          .split("\n")[0]
          .split(",")
          .map((x) => x.split('"')[1]);

      [
        "SKU",
        "Qty On Hand",
        "Product#",
        "UPC#",
        "SPR#",
        "Basics#",
        "CIS#",
        "Qty/UoM",
        "Unit of Measure",
      ].forEach((key) => {
        if (!headers.includes(key))
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
