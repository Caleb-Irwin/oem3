import polka from "polka";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createContext, router } from "./trpc";
import { userRouter } from "./routers/user";
import { kit } from "./kitMiddleware";
import { PORT, DEV } from "./config";

const app = polka();

app.use("/", (req, res, next) => {
  if (req.path.startsWith("/trpc")) {
    next();
    return;
  }
  kit(req, res, next);
});

const appRouter = router({
  user: userRouter,
});

export type AppRouter = typeof appRouter;

export type Test = number | string;

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
    allowBatching: true,
  })
);

app.listen(PORT, () => {
  console.log(`Running on port ${PORT} in ${DEV ? "DEV" : "PROD"} mode`);
});
