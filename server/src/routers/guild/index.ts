import { router } from "../../trpc";
import { guildInventoryHook, inventoryRouter } from "./inventory";
import { flyerRouter, guildFlyerHook } from "./flyer";
import { descRouter, guildDescHook } from "./desc";
import { guildDataHook, guildDataRouter } from "./data";
import { managedWorker } from "../../utils/managedWorker";

const { worker, hook } = managedWorker(
  new URL("worker.ts", import.meta.url).href,
  "unifiedGuild",
  [guildDataHook, guildFlyerHook, guildInventoryHook, guildDescHook]
);

export const guildHook = hook;

export const guildRouter = router({
  worker,
  inventory: inventoryRouter,
  flyer: flyerRouter,
  desc: descRouter,
  data: guildDataRouter,
});
