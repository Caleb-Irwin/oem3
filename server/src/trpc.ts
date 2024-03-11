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
  const userToken = cookies.get("jwt") ?? req.headers.authorization;
  if (userToken && jwt.verify(userToken, "secret")) {
    return {
      user: jwt.decode(userToken) as jwtFields,
      cookies,
    };
  }
  return {
    user: null,
    cookies,
  };
}
type Context = Awaited<ReturnType<typeof createContext>>;
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
