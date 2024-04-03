import { router } from "./trpc";
import { userRouter } from "./routers/user";
import { usersRouter } from "./routers/users";

export const appRouter = router({
  user: userRouter,
  users: usersRouter,
});
