import { router, publicProcedure } from "../trpc";
import { z } from "zod";
export const userRouter = router({
  list: publicProcedure.query(() => {
    // [..]
    return [];
  }),
});
