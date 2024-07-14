import { work } from "../../utils/workerBase";
declare var self: Worker;

work(
  self,
  null,
  async () => {},
  async ({ db, progress }) => {
    progress(0);
    return;
  }
);
