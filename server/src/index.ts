import polka from "polka";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createContext, router } from "./trpc";
import { kit } from "./kitMiddleware";
import { PORT, DEV } from "./config";
import { migrate } from "../db";
import { appRouter } from "./appRouter";

//@ts-expect-error bun allows this
await migrate();

const app = polka();

app.use("/", (req, res, next) => {
  if (req.path.startsWith("/trpc")) {
    next();
    return;
  }
  kit(req, res, next);
});

export type AppRouter = typeof appRouter;

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
