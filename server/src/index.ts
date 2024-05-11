import polka from "polka";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createContext } from "./trpc";
import { kit } from "./kitMiddleware";
import { PORT, DEV } from "./config";
import { migrate } from "./db";
import { appRouter } from "./appRouter";
import { WebSocketServer } from "ws";
import { applyWSSHandler } from "@trpc/server/adapters/ws";

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

const wss = new WebSocketServer({ server: app.server, path: "/trpc" });
applyWSSHandler<AppRouter>({
  wss,
  router: appRouter,
  createContext,
});
