import { work } from "../../../utils/workerBase";

declare var self: Worker;
work({
  self,
  process: async ({}) => {
    console.log("spr flat file worker TODO");
  },
});
