import { desc, gt } from "drizzle-orm";
import { KV } from "../../utils/kv";
import { work } from "../../utils/workerBase";
import { qb } from "../qb/table";
import PromisePool from "@supercharge/promise-pool";
import { search } from "./table";
declare var self: Worker;

work({
  self,
  process: async ({ db }) => {
    const kv = new KV("searchIndexing"),
      lastSearchUpdate = parseInt((await kv.get("lastSearchUpdate")) ?? "0");
    let newLastSearchUpdate: string = lastSearchUpdate.toString();

    await db.transaction(async (db) => {
      const toUpdate = await db.query.qb.findMany({
        with: { uniref: true },
        where: gt(qb.lastUpdated, lastSearchUpdate),
        orderBy: desc(qb.lastUpdated),
      });
      await PromisePool.for(toUpdate)
        .withConcurrency(100)
        .process(async (item) => {
          const baseId = item.qbId.includes(":")
              ? item.qbId.split(":")[1]
              : item.qbId,
            keyInfo = `${baseId.includes(" ") ? "" : baseId}`,
            otherInfo = `${item.desc} ${
              !baseId.includes(" ") ? getSubStrings(baseId) : baseId
            }`;
          await db
            .insert(search)
            .values({
              uniId: item.uniref.uniId,
              type: "qb",
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
    await kv.set("lastSearchUpdate", newLastSearchUpdate as string);
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

console.log(getSubStrings("1234567890"));
