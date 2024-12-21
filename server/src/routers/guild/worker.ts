import { desc, gt, isNull, or } from "drizzle-orm";
import { KV } from "../../utils/kv";
import { work } from "../../utils/workerBase";
import { guildData } from "./data/table";
import { unifiedGuild } from "./table";
import PromisePool from "@supercharge/promise-pool";
import { guildFlyer, guildInventory, uniref } from "../../db.schema";
import { insertHistory } from "../../utils/history";
import { updateUnifiedGuildRow } from "./updateUnifiedGuildRow";

declare var self: Worker;

work({
  self,
  process: async ({ db, progress }) => {
    progress(-1);
    await db.transaction(async (db) => {
      const rowsToUpdate = new Set<number>(),
        kv = new KV("unifiedGuild", db),
        lastGuildUpdate = 0; //TODO parseInt((await kv.get("lastGuildUpdate")) ?? "0");
      await db.delete(unifiedGuild).execute(); //TODO
      const currentTime = Date.now();

      // 1. Recently updated primary items + new items
      const recentlyUpdated = await db.query.guildData
        .findMany({
          columns: { id: true, gid: true, lastUpdated: true },
          where: gt(guildData.lastUpdated, lastGuildUpdate),
          with: { unifiedGuild: true },
          orderBy: desc(guildData.lastUpdated),
        })
        .execute();
      if (recentlyUpdated.length > 0) {
        await kv.set(
          "lastGuildUpdate",
          recentlyUpdated[0].lastUpdated.toString()
        );
      }
      const toAdd: typeof recentlyUpdated = [];
      for (const row of recentlyUpdated) {
        if (row?.unifiedGuild?.id) {
          rowsToUpdate.add(row.unifiedGuild.id);
        } else {
          toAdd.push(row);
        }
      }
      await PromisePool.withConcurrency(100)
        .for(toAdd)
        .process(async (row) => {
          const { id } = (
            await db
              .insert(unifiedGuild)
              .values({
                gid: row.gid,
                dataRow: row.id,
                lastUpdated: row.lastUpdated,
              })
              .returning({ id: unifiedGuild.id })
              .execute()
          )[0];
          rowsToUpdate.add(id);
          const { uniId } = (
            await db
              .insert(uniref)
              .values({ resourceType: "unifiedGuild", unifiedGuild: id })
              .returning({ uniId: uniref.uniId })
              .execute()
          )[0];
          await insertHistory({
            db,
            uniref: uniId,
            resourceType: "unifiedGuild",
            entryType: "create",
            data: { gid: row.gid, dataRow: row.id },
            created: currentTime,
          });
        });

      // 2. Find to match or update
      const inventoryLastUpdated = 0, //TODO
        // parseInt(
        //   (await kv.get("lastGuildInventoryUpdate")) ?? "0"
        // ),
        flyerLastUpdated = 0; //TODO
      //   parseInt(
      //   (await kv.get("lastGuildFlyerUpdate")) ?? "0"
      // )
      const toMatchOrUpdate = await db.query.unifiedGuild.findMany({
        columns: { id: true },
        where: or(
          isNull(unifiedGuild.inventoryRow),
          isNull(unifiedGuild.flyerRow),
          gt(guildInventory.lastUpdated, inventoryLastUpdated),
          gt(guildFlyer.lastUpdated, flyerLastUpdated)
        ),
        with: {
          inventoryRowContent: {
            columns: { lastUpdated: true },
          },
          flyerRowContent: {
            columns: { lastUpdated: true },
          },
        },
      });
      let greatestInventoryLastUpdated = inventoryLastUpdated,
        greatestFlyerLastUpdated = flyerLastUpdated;
      for (const row of toMatchOrUpdate) {
        rowsToUpdate.add(row.id);
        if (
          row.inventoryRowContent &&
          greatestInventoryLastUpdated < row.inventoryRowContent.lastUpdated
        )
          greatestInventoryLastUpdated = row.inventoryRowContent.lastUpdated;
        if (
          row.flyerRowContent &&
          greatestFlyerLastUpdated < row.flyerRowContent.lastUpdated
        )
          greatestFlyerLastUpdated = row.flyerRowContent.lastUpdated;
      }
      await kv.set(
        "lastGuildInventoryUpdate",
        greatestInventoryLastUpdated.toString()
      );
      await kv.set("lastGuildFlyerUpdate", greatestFlyerLastUpdated.toString());

      // 3. Update matches + summaries
      const total = toMatchOrUpdate.length;
      let done = 0;
      await PromisePool.withConcurrency(100)
        .for(rowsToUpdate)
        .handleError(async (error, _, pool) => {
          console.error(error);
          return pool.stop();
        })
        .process(async (id) => {
          await updateUnifiedGuildRow(id, db);
          done++;
          if (done % 100 === 0) progress(done / total);
        });

      // 4. Done!
    });
  },
});
