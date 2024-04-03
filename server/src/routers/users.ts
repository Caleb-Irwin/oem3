import { z } from "zod";
import { db } from "../../db";
import { adminProcedure, router } from "../trpc";
import { permissionLevelEnumZod, users } from "../../db/db";
import { TRPCError } from "@trpc/server";

export const usersRouter = router({
  all: adminProcedure.query(async () => {
    return await db.query.users.findMany();
  }),
  create: adminProcedure
    .input(
      z.object({
        username: z
          .string()
          .min(3, "Username must be at least 3 characters")
          .toLowerCase(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        permissionLevel: permissionLevelEnumZod,
      })
    )
    .mutation(async (opts) => {
      const res = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.username, opts.input.username),
      });

      if (res || opts.input.username === "admin")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Username Already Taken",
        });

      await db.insert(users).values({
        username: opts.input.username,
        passwordHash: await Bun.password.hash(opts.input.password),
        permissionLevel: opts.input.permissionLevel,
      });
    }),
});
