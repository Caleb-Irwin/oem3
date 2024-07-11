import { z } from "zod";
import { generalProcedure, router } from "../trpc";
import { db } from "../db";
import { desc, eq } from "drizzle-orm";
import { history, uniref } from "../db.schema";

export const resourcesRouter = router({
  get: generalProcedure
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
});
