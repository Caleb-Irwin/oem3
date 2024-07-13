import { z } from "zod";
import { router, viewerProcedure } from "../trpc";
import { db } from "../db";
import { desc, eq } from "drizzle-orm";
import { history, uniref } from "../db.schema";

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
          with: {
            changesetData: true,
            qbData: true,
          },
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
  getChangsets: viewerProcedure.query(async () => {
    return await db.query.history.findMany({
      where: eq(history.resourceType, "changeset"),
      orderBy: desc(history.created),
    });
  }),
});
