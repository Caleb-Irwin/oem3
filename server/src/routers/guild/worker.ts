import { work } from "../../utils/workerBase";
import { guildUnifier } from "./guildUnifier";
declare var self: Worker;

work({
  self,
  process: async ({ progress, utils: { customMessage } }) => {
    await guildUnifier.updateUnifiedTable({
      progress,
      onUpdateCallback: (uniId) => customMessage(uniId.toString())
    });
  },
});
