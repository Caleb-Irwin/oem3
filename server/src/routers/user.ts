import { router, publicProcedure } from "../trpc";
import { z } from "zod";

export const userRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .query((opts) => {
      const { username, password } = opts.input;
      console.log(`Username: ${username}; Password: ${password}`);
      return Math.random() > 0.5;
    }),
});
