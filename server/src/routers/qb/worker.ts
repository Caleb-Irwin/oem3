import { work } from "../../utils/workerBase";

declare var self: Worker;

work(
  self,
  async ({}) => {
    return 100;
  },
  async ({ incrementProgress }) => {
    let i = 0;
    while (i < 10) {
      incrementProgress(10);
      await Bun.sleep(100);
      i++;
    }
  }
);
