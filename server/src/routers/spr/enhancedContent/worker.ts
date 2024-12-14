import { work } from "../../../utils/workerBase";

declare var self: Worker;

work({
  self,
  process: async ({}) => {
    console.log("spr enhanced content worker TODO");
  },
});
