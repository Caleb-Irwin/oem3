import { TRPCError, initTRPC } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";
import Cookies from "cookies";
import jwt from "jsonwebtoken";
import { jwtFields } from "./routers/user";
import { env } from "bun";

export function createContext(
  ctx: CreateExpressContextOptions | CreateWSSContextFnOptions
): {
  user?: jwtFields;
  cookies?: Cookies;
} {
  if (ctx.res["protocol"]) {
    const { res, req } = ctx as CreateWSSContextFnOptions;
    console.log("WS (trpc)");
    // TODO WebSocket authentication
    return {
      user: undefined,
      cookies: undefined,
    };
  } else {
    const { res, req } = ctx as CreateExpressContextOptions;
    console.log("Express (trpc)");

    const cookies = new Cookies(req, res);
    try {
      const userToken = cookies.get("jwt") ?? req.headers.authorization;

      const user = userToken
        ? (jwt.verify(userToken, env["JWT_SECRET"]) as jwtFields)
        : undefined;

      if (userToken && user)
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
}
type Context = Awaited<ReturnType<typeof createContext>>;
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const adminProcedure = publicProcedure.use((opts) => {
  const { ctx } = opts;
  if (ctx.user && ctx.user.permissionLevel === "admin") return opts.next();
  else throw new TRPCError({ code: "UNAUTHORIZED" });
});
