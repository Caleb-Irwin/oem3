import { desc, gt } from "drizzle-orm";
import { KV } from "../../utils/kv";
import { work } from "../../utils/workerBase";
import { guildData } from "./data/table";

declare var self: Worker;

work({
  self,
  process: async ({ db, progress }) => {
    await db.transaction(async (db) => {
      const gidsToUpdate = new Set<string>(),
        kv = new KV("unifiedGuild", db),
        lastGuildUpdate = parseInt((await kv.get("lastGuildUpdate")) ?? "0");
      const recentlyUpdated = await db.query.guildData
        .findMany({
          columns: { gid: true, lastUpdated: true },
          where: gt(guildData.lastUpdated, lastGuildUpdate),
          orderBy: desc(guildData.lastUpdated),
        })
        .execute();

      if (recentlyUpdated.length > 0) {
        await kv.set(
          "lastGuildUpdate",
          recentlyUpdated[0].lastUpdated.toString()
        );
      }

      for (const { gid } of recentlyUpdated) {
        gidsToUpdate.add(gid);
      }
    });

    console.log("Guild Worker TODO");
  },
});
