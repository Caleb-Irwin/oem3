import { z } from "zod";
import { router, viewerProcedure } from "../../trpc";
import { managedWorker } from "../../utils/managedWorker";
import { desc, sql } from "drizzle-orm";
import { search } from "./table";
import { db } from "../../db";
import { qbHook } from "../qb";
import { resourceWith } from "../resources";
import { guildHook } from "../guild";
import { guildInventoryHook } from "../guild/inventory";
import { changesetType } from "../../db.schema";
import { guildFlyerHook } from "../guild/flyer";
import { shopifyHook } from "../shopify";
import { sprPriceFileHook } from "../spr/priceFile";
import { sprFlatFileHook } from "../spr/flatFile";

const { worker } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "search",
  [
    qbHook,
    guildHook,
    guildInventoryHook,
    guildFlyerHook,
    shopifyHook,
    sprPriceFileHook,
    sprFlatFileHook,
  ]
);

const queryTypeValues = ["all", ...changesetType.enumValues] as const;
export type QueryType = (typeof queryTypeValues)[number];

export const searchRouter = router({
  worker,
  search: viewerProcedure
    .input(
      z.object({
        query: z.string(),
        type: z.enum(queryTypeValues),
        page: z.number().int().default(0),
      })
    )
    .query(async ({ input: { query, type: queryType, page } }) => {
      const PAGE_SIZE = 48,
        processedQuery = query.split(" ").join(" | ");

      // https://orm.drizzle.team/learn/guides/postgresql-full-text-search
      const matchQuery = sql`(
        setweight(to_tsvector('english', ${search.keyInfo}), 'A') ||
        setweight(to_tsvector('english', ${search.otherInfo}), 'B')), to_tsquery('english', ${processedQuery})`;

      const res = await db.query.search.findMany({
        where: sql`(${
          queryType === "all" ? sql`TRUE` : sql`${search.type} = ${queryType}`
        }) AND ((
            setweight(to_tsvector('english', ${search.keyInfo}), 'A') ||
            setweight(to_tsvector('english', ${search.otherInfo}), 'B')
            ) @@ to_tsquery('english', ${processedQuery}))`,
        extras: {
          rank: sql`ts_rank(${matchQuery})`.as("rank"),
          rankCd: sql`ts_rank_cd(${matchQuery})`.as("rank_cd"),
        },
        orderBy: () => desc(sql`rank`),
        with: {
          uniref: {
            with: resourceWith,
          },
        },
        limit: PAGE_SIZE + 1,
        offset: page * PAGE_SIZE,
      });

      const more = res.length === PAGE_SIZE + 1;

      return {
        query,
        queryType,
        results: res.slice(0, PAGE_SIZE),
        page,
        count: page * PAGE_SIZE + res.length - (more ? 1 : 0),
        more,
      };
    }),
});
