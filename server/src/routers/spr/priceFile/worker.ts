import { work } from "../../../utils/workerBase";

declare var self: Worker;
work({
  self,
  process: async ({}) => {
    console.log("spr price file worker TODO");
  },
});
