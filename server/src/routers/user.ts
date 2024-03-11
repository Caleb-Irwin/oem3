import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import jwt from "jsonwebtoken";

export interface jwtFields {
  username: string;
  admin: boolean;
}

export const userRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { username, password } = input,
        passwordHash = await Bun.password.hash(password);

      //TODO store + verify users

      const token = jwt.sign(
        { username, admin: false } satisfies jwtFields,
        "secret",
        {
          expiresIn: "12h",
        }
      );
      ctx.cookies.set("jwt", token);

      return { pass: Math.random() > 0.5, token };
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.cookies.set("jwt", "", { expires: new Date() });
  }),
});
