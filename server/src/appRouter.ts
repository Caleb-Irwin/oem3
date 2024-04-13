import { router } from "./trpc";
import { userRouter } from "./routers/user";
import { usersRouter } from "./routers/users";
import { labelsRouter } from "./routers/labels";

export const appRouter = router({
  user: userRouter,
  users: usersRouter,
  labels: labelsRouter,
});
