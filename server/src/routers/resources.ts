import { z } from "zod";
import { router, viewerProcedure } from "../trpc";
import { db } from "../db";
import { desc, eq } from "drizzle-orm";
import {
  changesets,
  changesetType,
  guildDescriptions,
  history,
  resourceTypeEnum,
  sprEnhancedContent,
  uniref,
  type ResourceType,
} from "../db.schema";
import { TRPCError } from "@trpc/server";
import { addOrSmartUpdateImage, getAccessURLBySourceURL } from "../utils/images";
import { eventSubscription } from "../utils/eventSubscription";

export const resourceWith = {
  changesetData: true as true,
  qbData: true as true,
  guildData: true as true,
  guildInventoryData: true as true,
  guildFlyerData: true as true,
  shopifyData: true as true,
  sprPriceFileData: true as true,
  sprFlatFileData: true as true,
  unifiedGuildData: true as true,
};

export const getResource = async ({ input: { uniId, type, id, includeHistory } }: { input: { uniId: number; type?: string; id?: number; includeHistory: boolean } }) => {
  if (uniId === -1 && type && id) {
    const maybeUniId = (
      await db.query.uniref.findFirst({
        where: eq(uniref[type as ResourceType], id),
      })
    )?.uniId;

    if (!maybeUniId)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "UniId Item Not Found",
      });
    uniId = maybeUniId;
  }

  const res =
    (await db.query.uniref.findFirst({
      where: eq(uniref.uniId, uniId),
      with: resourceWith,
    })) ?? null;
  if (res && includeHistory) {
    const historyRes = await db.query.history.findMany({
      where: eq(history.uniref, res.uniId),
      orderBy: desc(history.id),
    });
    return { history: historyRes, ...res };
  }
  return { history: null, ...res };
}

const { update, createSub } = eventSubscription();
export const updateByChangesetType = update;

export const resourcesRouter = router({
  get: viewerProcedure
    .input(
      z.object({
        uniId: z.number().int(),
        type: z.enum(resourceTypeEnum.enumValues).optional(),
        id: z.number().int().optional(),
        includeHistory: z.boolean().default(false),
      })
    )
    .query(getResource),
  getSub: createSub<{ uniId: number; type?: string; id?: number; includeHistory: boolean }, Awaited<ReturnType<typeof getResource>>>(
    async ({ input }) => {
      return await getResource({ input });
    }
  ),
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
          ).map(async (line) => {
            if (!line.uniref) return;
            return await db.query.history.findFirst({
              where: eq(history.uniref, line.uniref.uniId),
            });
          })
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
  sprEnhancedContent: viewerProcedure
    .input(
      z.object({
        etilizeId: z.string().optional(),
        gid: z.string().optional(),
      })
    )
    .query(
      async ({
        input: { etilizeId, gid },
      }): Promise<{
        guild: typeof guildDescriptions.$inferSelect | undefined;
        spr: typeof sprEnhancedContent.$inferSelect | undefined;
      }> => {
        if (etilizeId) {
          return {
            guild: undefined,
            spr: await db.query.sprEnhancedContent.findFirst({
              where: eq(sprEnhancedContent.etilizeId, etilizeId),
            }),
          };
        } else if (gid) {
          return {
            guild: await db.query.guildDescriptions.findFirst({
              where: eq(guildDescriptions.gid, gid),
            }),
            spr: undefined,
          };
        }
        return {
          guild: undefined,
          spr: undefined,
        };
      }
    ),
  getImageUrl: viewerProcedure
    .input(z.object({ originalURL: z.string(), thumbnail: z.boolean().default(false) }))
    .query(async ({ input: { originalURL, thumbnail } }) => {
      const gid = originalURL.startsWith("https://shopofficeonline.com/ProductImages/") ? originalURL.slice(originalURL.indexOf('https://shopofficeonline.com/ProductImages/') + 43, originalURL.indexOf('.jpg')).replace(
        /[\W_]+/g,
        ""
      ) : null;
      if (gid)
        originalURL = `https://shopofficeonline.com/ProductImages/${gid}.jpg`;


      const image = await getAccessURLBySourceURL(originalURL, thumbnail);

      if (!image) {
        if (gid) {
          await addOrSmartUpdateImage(`https://shopofficeonline.com/ProductImages/${gid.replace(
            /[\W_]+/g,
            ""
          )}.jpg`, gid, "shopofficeonline", true);
          return await getAccessURLBySourceURL(originalURL, thumbnail) ?? originalURL;
        }

        return originalURL;
      }
      return image;
    })
});
