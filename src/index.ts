import polka from "polka";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createContext, router } from "./trpc";
import { userRouter } from "./routers/user";
import { kit } from "./kitMiddleware";

const DEV = process.env["DEV"] === "TRUE",
  PORT = process.env["PORT"] ?? "3000";

const appRouter = router({
  user: userRouter,
});

export type AppRouter = typeof appRouter;

const app = polka();

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.use(await kit(PORT, DEV));

app.listen(PORT, () => {
  console.log(`> Running on port ${PORT} in ${DEV ? "DEV" : "PROD"} mode`);
});
