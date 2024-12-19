import { desc, gt } from "drizzle-orm";
import { KV } from "../../utils/kv";
import { work } from "../../utils/workerBase";
import PromisePool from "@supercharge/promise-pool";
import { search } from "./table";
import {
  guildData,
  guildFlyer,
  guildInventory,
  qb,
  shopify,
  sprFlatFile,
  sprPriceFile,
  type ChangesetTable,
  type ResourceType,
} from "../../db.schema";
import { getTableConfig } from "drizzle-orm/pg-core";
declare var self: Worker;

work({
  self,
  process: async ({ db }) => {
    const kv = new KV("searchIndexing");
    async function updateSearchIndex<T extends ChangesetTable>(
      searchTable: T,
      infoFunc: (item: T["$inferSelect"]) => {
        keyInfo: string;
        otherInfo: string;
      }
    ) {
      const resourceName = getTableConfig(searchTable).name as Exclude<
          ResourceType,
          "changeset"
        >,
        lastSearchUpdate = parseInt(
          (await kv.get("lastSearchUpdate/" + resourceName)) ?? "0"
        );
      let newLastSearchUpdate: string = lastSearchUpdate.toString();
      await db.transaction(async (db) => {
        const toUpdate = await (
          {
            qb: db.query.qb,
            guildData: db.query.guildData,
            guildInventory: db.query.guildInventory,
            guildFlyer: db.query.guildFlyer,
            shopify: db.query.shopify,
            sprPriceFile: db.query.sprPriceFile,
            sprFlatFile: db.query.sprFlatFile,
            unifiedItem: db.query.unifiedItems,
          }[resourceName] as typeof db.query.qb
        ).findMany({
          with: { uniref: true },
          where: gt(searchTable.lastUpdated, lastSearchUpdate),
          orderBy: desc(searchTable.lastUpdated),
        });
        await PromisePool.for(toUpdate)
          .withConcurrency(100)
          .process(async (item) => {
            const { keyInfo, otherInfo } = infoFunc(item);
            await db
              .insert(search)
              .values({
                uniId: item.uniref.uniId,
                type: resourceName,
                keyInfo,
                otherInfo,
              })
              .onConflictDoUpdate({
                target: search.uniId,
                set: { keyInfo, otherInfo },
              });
          });
        newLastSearchUpdate = String(
          toUpdate[0]?.lastUpdated ?? lastSearchUpdate
        );
      });
      await kv.set(
        "lastSearchUpdate/" + resourceName,
        newLastSearchUpdate as string
      );
    }

    await updateSearchIndex(qb, (item) => {
      const baseId = item.qbId.includes(":")
        ? item.qbId.split(":")[1]
        : item.qbId;
      return {
        keyInfo: `${
          baseId.includes(" ") || baseId.includes("-") ? "" : baseId
        }`,
        otherInfo: `${item.desc} ${
          !baseId.includes(" ") && baseId.length < 20
            ? getSubStrings(baseId)
            : baseId
        }`,
      };
    });
    await updateSearchIndex(guildData, (item) => {
      return {
        keyInfo: `${item.gid} ${item.upc ?? ""} ${item.basics ?? ""} ${
          item.cis ?? ""
        } ${item.spr ?? ""}`,
        otherInfo: `${item.shortDesc} ${item.longDesc} ${getSubStrings(
          item.gid
        )} ${getSubStrings(item.upc ?? "")}`,
      };
    });
    await updateSearchIndex(guildInventory, (item) => {
      return {
        keyInfo: `${item.gid} ${item.upc ?? ""} ${item.basics ?? ""} ${
          item.cis ?? ""
        } ${item.spr ?? ""}`,
        otherInfo: `${getSubStrings(item.gid)} ${getSubStrings(
          item.upc ?? ""
        )}`,
      };
    });
    await updateSearchIndex(guildFlyer, (item) => {
      return {
        keyInfo: `${item.gid}`,
        otherInfo: `${item.vendorCode} ${getSubStrings(item.gid)}}`,
      };
    });
    await updateSearchIndex(shopify, (item) => {
      return {
        keyInfo: `${item.vSku} ${item.productId}`,
        otherInfo: `${item.title} ${item.htmlDescription} ${getSubStrings(
          item.vSku ?? ""
        )} ${JSON.parse(item.tagsJsonArr || "[]").join(" ")}`,
      };
    });
    await updateSearchIndex(sprPriceFile, (item) => {
      return {
        keyInfo: `${item.sprcSku} ${item.upc} ${item.etilizeId}`,
        otherInfo: `${item.description} ${getSubStrings(
          item.sprcSku ?? ""
        )} ${getSubStrings(item.upc ?? "")}`,
      };
    });
    await updateSearchIndex(sprFlatFile, (item) => {
      return {
        keyInfo: `${item.sprcSku} ${item.etilizeId}`,
        otherInfo: `${item.fullDescription} ${item.manufacturerName} ${
          item.keywords
        } ${getSubStrings(item.sprcSku ?? "")} `,
      };
    });
  },
});

function getSubStrings(str: string, length = 3): string {
  if (str.length < length) return "";
  let res = "";
  for (let i = 0; i <= str.length - length; i++) {
    res += " " + str.substring(i, i + length);
  }
  return res + " " + getSubStrings(str, length + 1);
}
