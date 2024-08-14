import { work } from "../../utils/workerBase";

declare var self: Worker;
work({
  self,
  process: async ({}) => {
    console.log("Hello from Shopify Worker!");
  },
});
