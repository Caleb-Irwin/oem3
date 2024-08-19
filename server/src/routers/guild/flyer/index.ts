import { TRPCError } from "@trpc/server";
import { router } from "../../../trpc";
import { fileProcedures } from "../../../utils/files";
import { managedWorker } from "../../../utils/managedWorker";
import * as xlsx from "xlsx";
import { KV } from "../../../utils/kv";
import type { GuildFlyerRaw } from "./worker";

const { worker, runWorker, hook } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "guildFlyer"
);

export const guildFlyerHook = hook;

export const flyerRouter = router({
  files: fileProcedures(
    "guildFlyer",
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
        "Flyer # ",
        "Date Flyer Starts ",
        "Date Flyer Ends",
        "Manufacture's Code",
        "Item Stock #",
        "Flyer Cost",
        "Flyer Price Level 0",
        "Flyer Price Level 1",
        "Flyer Price Retail Level",
        "Regular Price Level 0",
        "Regular Price Level 1",
      ].forEach((key) => {
        if (!(key in (guildObjects[0] as object)))
          throw new TRPCError({
            message: "Missing Column: " + key,
            code: "BAD_REQUEST",
          });
      });
    },
    runWorker,
    async () => {
      const kv = new KV("guildFlyer");

      const txt = await (
        await fetch(
          "https://www.guildstationers.com/images/+Public/MA-Data/+Vezina_J/?C=M;O=D"
        )
      ).text();

      const fileName = (txt.match(/(?<=href=").*?TCC_Flyer_File\.xlsx(?=")/g) ??
        [])[0];

      if (!fileName)
        throw new TRPCError({
          message: "Could not find flyer file name",
          code: "NOT_FOUND",
        });

      if ((await kv.get("lastDownloadedName")) === encodeURIComponent(fileName))
        return null;

      const res = await fetch(
        "https://www.guildstationers.com/images/+Public/MA-Data/+Vezina_J/" +
          fileName
      );

      const dataUrl = `data:${res.headers.get("Content-Type")};base64,${btoa(
        String.fromCharCode(...new Uint8Array(await res.arrayBuffer()))
      )}`;

      const workbook = xlsx.read(
          dataUrl.slice(dataUrl.indexOf(";base64,") + 8)
        ),
        worksheet = workbook.Sheets[workbook.SheetNames[0]],
        flyerObjects = xlsx.utils.sheet_to_json(worksheet);

      const row = flyerObjects[0] as GuildFlyerRaw,
        startDate = new Date(row["Date Flyer Starts "] + ": GMT-0600"),
        endDate = new Date(row["Date Flyer Ends"] + ": GMT-0600");

      const name = `${startDate.toLocaleDateString("en-CA", {
        dateStyle: "medium",
      })} to ${endDate.toLocaleDateString("en-CA", {
        dateStyle: "medium",
      })} Flyer (${fileName.slice(0, fileName.indexOf("."))}).${fileName.slice(
        fileName.indexOf(".") + 1
      )}`;

      await kv.set("lastDownloadedName", encodeURIComponent(fileName));
      return { name, dataUrl, apply: false };
    },
    true
  ),
  worker,
});
