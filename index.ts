import polka from "polka";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createContext, router } from "./trpc";
import { userRouter } from "./user";
import { kit } from "./kit";

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

app.use(kit);

app.listen(process.env["PORT"] ?? 3000, () => {
  console.log(`> Running`);
});
