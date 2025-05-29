import { work } from "../../utils/workerBase";
import { guildUnifier } from "./guildUnifier";

work({
  process: async ({ progress, utils: { customMessage } }) => {
    await guildUnifier.updateUnifiedTable({
      progress,
      onUpdateCallback: (uniId) => customMessage(uniId.toString())
    });
  },
});
