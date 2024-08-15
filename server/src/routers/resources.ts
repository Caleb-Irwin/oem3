import { z } from "zod";
import { router, viewerProcedure } from "../trpc";
import { db } from "../db";
import { desc, eq } from "drizzle-orm";
import {
  changesets,
  changesetType,
  history,
  resourceTypeEnum,
  uniref,
} from "../db.schema";

export const resourceWith = {
  changesetData: true as true,
  qbData: true as true,
  guildData: true as true,
  guildInventoryData: true as true,
  guildFlyerData: true as true,
  shopifyData: true as true,
};

export const resourcesRouter = router({
  get: viewerProcedure
    .input(
      z.object({
        uniId: z.number().int(),
        includeHistory: z.boolean().default(false),
      })
    )
    .query(async ({ input: { uniId, includeHistory } }) => {
      const res =
        (await db.query.uniref.findFirst({
          where: eq(uniref.uniId, uniId),
          with: resourceWith,
        })) ?? null;
      if (res && includeHistory) {
        const historyRes = await db.query.history.findMany({
          where: eq(history.uniref, res.uniId),
          orderBy: desc(history.created),
        });
        return { history: historyRes, ...res };
      }
      return res;
    }),
  getChangesets: viewerProcedure
    .input(z.object({ type: z.enum(changesetType.enumValues) }))
    .query(async ({ input: { type } }) => {
      return (
        await Promise.all(
          (
            await db.query.changesets.findMany({
              where: eq(changesets.type, type),
              with: {
                uniref: true,
              },
              orderBy: desc(changesets.created),
            })
          ).map(
            async (line) =>
              await db.query.history.findFirst({
                where: eq(history.uniref, line.uniref.uniId),
              })
          )
        )
      ).filter((v) => typeof v === "object");
    }),
  getUniId: viewerProcedure
    .input(
      z.object({
        type: z.enum(resourceTypeEnum.enumValues),
        id: z.number().int(),
      })
    )
    .query(async ({ input: { id, type } }) => {
      return await db.query.uniref.findFirst({
        where: eq(uniref[type], id),
      });
    }),
});
