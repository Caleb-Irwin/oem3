import { z } from "zod";
import { router, viewerProcedure } from "../../trpc";
import { managedWorker } from "../../utils/managedWorker";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { unifiedItems } from "./table";

const { worker, hook } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "unifiedItems"
);

export const unifiedItemsHook = hook;

export const unifiedItemsRouter = router({
  worker,
  item: viewerProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      return await db.query.unifiedItems.findFirst({
        where: eq(unifiedItems.id, input.id),
        with: {
          guildData: {
            with: {
              uniref: true,
              desc: true,
            },
          },
          sprPriceFileData: {
            with: {
              uniref: true,
            },
          },
          sprFlatFileData: {
            with: {
              uniref: true,
              enhancedContent: true,
            },
          },
          guildInventoryData: {
            with: {
              uniref: true,
            },
          },
          guildFlyerData: {
            with: {
              uniref: true,
            },
          },
          shopifyData: {
            with: {
              uniref: true,
            },
          },
          shopifyAltData: {
            with: {
              uniref: true,
            },
          },
          qbData: {
            with: {
              uniref: true,
            },
          },
          qbAltData: {
            with: {
              uniref: true,
            },
          },
        },
      });
    }),
  items: viewerProcedure.query(async ({}) => {
    return await db.query.unifiedItems.findMany();
  }),
});
