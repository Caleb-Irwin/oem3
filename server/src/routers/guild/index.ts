import { router } from "../../trpc";
import { inventoryRouter } from "./inventory";
import { flyerRouter } from "./flyer";
import { descRouter } from "./desc";
import { guildDataRouter } from "./data";

export const guildRouter = router({
  inventory: inventoryRouter,
  flyer: flyerRouter,
  desc: descRouter,
  data: guildDataRouter,
});
