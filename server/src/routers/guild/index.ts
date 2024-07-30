import { TRPCError } from "@trpc/server";
import { router } from "../../trpc";
import { fileProcedures } from "../../utils/files";
import { managedWorker } from "../../utils/managedWorker";

const { worker, runWorker, hook } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "guild"
);
export const guildHook = hook;

export const guildRouter = router({
  ...fileProcedures(
    "guild",
    async (_, fileType) => {
      console.log(fileType);

      if (
        fileType !==
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
        throw new TRPCError({
          message: "Invalid File Type (XLSX Only)",
          code: "BAD_REQUEST",
        });
    },
    runWorker
  ),
  worker,
});
