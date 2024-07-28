import { work } from "../../utils/workerBase";
declare var self: Worker;

work({
  self,
  process: async ({ db, progress }) => {
    progress(0);
    console.log("TODO: implement search worker");
    return;
  },
});
