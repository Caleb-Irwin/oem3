import { work } from "../../utils/workerBase";
import { unifiedGuild } from "./table";
import { guildUnifier } from "./guildUnifier";
declare var self: Worker;

work({
  self,
  process: async ({ db, progress }) => {
    await db.delete(unifiedGuild).execute(); // TODO: Remove this
    await guildUnifier.updateUnifiedTable({
      progress,
    });
  },
});
