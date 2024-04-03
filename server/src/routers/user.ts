import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { PermissionLevel } from "../../db/db";
import { env } from "bun";
import { db } from "../../db";
import { TRPCError } from "@trpc/server";

export interface jwtFields {
  username: string;
  permissionLevel: PermissionLevel;
}

export const userRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3, "Username must be at least 3 characters")
          .toLowerCase(),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { username, password } = input;
      let token: string;

      if (username === "admin") {
        if (password === env["ADMIN_PASSWORD"]) token = sign(username, "admin");
      } else {
        const user = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.username, username),
        });
        if (!user)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Incorrect Username",
          });

        if (await Bun.password.verify(password, user.passwordHash))
          token = sign(user.username, user.permissionLevel);
      }

      if (!token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Incorrect Password",
        });
      }

      ctx.cookies.set("jwt", token);

      return { token };
    }),
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.cookies.set("jwt", "", { expires: new Date() });
  }),
});

function sign(username: string, permissionLevel: PermissionLevel): string {
  return jwt.sign(
    { username, permissionLevel } satisfies jwtFields,
    env["JWT_SECRET"],
    {
      expiresIn: "12h",
    }
  );
}
