import { TRPCError, initTRPC } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";
import Cookies from "cookies";
import jwt from "jsonwebtoken";
import { jwtFields } from "./routers/user";
import { env } from "bun";
import { usersKv } from "./utils/kv";

export async function createContext(
  ctx: CreateExpressContextOptions | CreateWSSContextFnOptions
): Promise<{
  user?: jwtFields;
  cookies?: Cookies;
}> {
  if ((ctx as CreateWSSContextFnOptions).req.headers.upgrade === "websocket") {
    return {
      user: undefined,
    };
  }

  const { res, req } = ctx as CreateExpressContextOptions,
    cookies = new Cookies(req, res);

  try {
    const userToken = cookies.get("jwt") ?? req.headers.authorization;

    const user = userToken
      ? (jwt.verify(userToken, env["JWT_SECRET"]) as jwtFields)
      : undefined;

    if (
      userToken &&
      user &&
      user.iat > parseInt((await usersKv.get("onlyValidAfterSeconds")) ?? "0")
    )
      return {
        user,
        cookies,
      };
    else
      return {
        user: null,
        cookies,
      };
  } catch (e) {
    console.log(e);
    return {
      user: null,
      cookies,
    };
  }
}
export type Context = Awaited<ReturnType<typeof createContext>>;
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const adminProcedure = publicProcedure.use((opts) => {
  const { ctx } = opts;
  if (ctx.user && ctx.user.permissionLevel === "admin") return opts.next();
  else throw new TRPCError({ code: "UNAUTHORIZED" });
});

export const generalProcedure = publicProcedure.use((opts) => {
  const { ctx } = opts;
  if (
    ctx.user &&
    (ctx.user.permissionLevel === "general" ||
      ctx.user.permissionLevel === "admin")
  )
    return opts.next();
  else throw new TRPCError({ code: "UNAUTHORIZED" });
});

export const viewerProcedure = publicProcedure.use((opts) => {
  const { ctx } = opts;
  if (
    ctx.user &&
    (ctx.user.permissionLevel === "viewer" ||
      ctx.user.permissionLevel === "general" ||
      ctx.user.permissionLevel === "admin")
  )
    return opts.next();
  else throw new TRPCError({ code: "UNAUTHORIZED" });
});
