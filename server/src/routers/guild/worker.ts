import { work } from "../../utils/workerBase";
import { guildUnifier } from "./guildUnifier";
declare var self: Worker;

work({
  self,
  process: async ({ progress }) => {
    await guildUnifier.updateUnifiedTable({
      progress,
    });
  },
});
