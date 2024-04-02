import { initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import Cookies from "cookies";
import jwt from "jsonwebtoken";
import { jwtFields } from "./routers/user";

export function createContext({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions): {
  user?: jwtFields;
  cookies: Cookies;
} {
  const cookies = new Cookies(req, res);
  try {
    const userToken = cookies.get("jwt") ?? req.headers.authorization;
    const user = userToken
      ? (jwt.verify(userToken, "secret") as jwtFields)
      : undefined;
    if (userToken && user) {
      return {
        user,
        cookies,
      };
    }
  } catch (e) {
    console.log(e);
  } finally {
    return {
      user: null,
      cookies,
    };
  }
}
type Context = Awaited<ReturnType<typeof createContext>>;
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
