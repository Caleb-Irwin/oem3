import { router } from "./trpc";
import { userRouter } from "./routers/user";
import { usersRouter } from "./routers/users";
import { labelsRouter } from "./routers/labels";
import { qbRouter } from "./routers/qb";
import { resourcesRouter } from "./routers/resources";
import { searchRouter } from "./routers/search";
import { guildRouter } from "./routers/guild";

export const appRouter = router({
  user: userRouter,
  users: usersRouter,
  labels: labelsRouter,
  resources: resourcesRouter,
  search: searchRouter,
  qb: qbRouter,
  guild: guildRouter,
});
